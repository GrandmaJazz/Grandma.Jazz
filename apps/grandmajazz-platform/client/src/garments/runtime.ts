import * as THREE from "three";
import { buildCabinet, createCabinetMaterials, lightCabinet } from "./cabinet";
import { clamp01, curlPoint, dragCurl, easeInOut, shouldCompleteTurn, canTransition, type ReaderMode, type CurlDirection } from "./curl";
import { buildMasterArchive, getLogicalPages, sheetCount, type GarmentsIssue, type MasterArchive, type MasterPage } from "./issues";
import { PageTextures, pageTexture } from "./textures";
import { fitReader, readerTiming, releaseDuration, boundedPan, tapZone, gestureDirection, latestFrameValue } from "./readerLayout";
import { archiveTurn, releaseProgress, shelfRails, type ArchiveTurn } from "./navigation";

export type ReaderStatus = { mode: ReaderMode; slug: string | null; page: number; count: number; zoom: number; error: string | null; coversPending?: number; globalPage?: number; globalCount?: number; issueNumber?: string; issueIndex?: number; pageType?: MasterPage["pageType"] };
export type ReaderCommand = "next" | "previous" | "close" | "retry";
export type RailStatus = { row: number; offset: number; count: number; slots: number; top: number; busy: boolean };
export type ReaderHint = { x: number; y: number };
export type Callbacks = { status: (status: ReaderStatus) => void; selected: (slug: string) => void; closed: () => void; fallback: () => void; centreTap?: () => void; backdrop?: (image: string) => void; hint?: (hint: ReaderHint | null) => void; rails?: (rows: RailStatus[], slugs: string[]) => void };
type Pose = { position: THREE.Vector3; rotation: THREE.Quaternion };
type Book = {
  issue: GarmentsIssue; shelfIssue: GarmentsIssue; group: THREE.Group; leftGroup: THREE.Group; rightGroup: THREE.Group;
  left: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  right: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  exterior: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  leftStack: THREE.Mesh; rightStack: THREE.Mesh; home: Pose; cover?: THREE.Texture;
  width: number; height: number;
};

export function createReader(host: HTMLDivElement, issues: GarmentsIssue[], cb: Callbacks, shelfIssues = issues) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor("#0a0a0a");
  const nativePixelRatio = Math.min(devicePixelRatio, 3);
  renderer.setPixelRatio(nativePixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  host.append(renderer.domElement);
  const canvas = renderer.domElement;
  host.dataset.coversLoaded = "0";
  canvas.setAttribute("aria-label", "Garments magazine newsstand");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  host.dataset.readerInstance = camera.uuid;
  const light = new THREE.DirectionalLight("#ffffff", 2.05);
  light.position.set(-3, 5, 7);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.1, far: 20 });
  light.shadow.normalBias = 0.009;
  light.shadow.bias = -0.00006;
  light.shadow.radius = 3;
  scene.add(light, new THREE.HemisphereLight("#ffffff", "#696961", 1.1));
  const fill = new THREE.DirectionalLight("#ffffff", 0.5);
  fill.position.set(3, 0, 5); scene.add(fill);

  const cabinetScene = new THREE.Scene();
  const rack = new THREE.Group(); cabinetScene.add(rack);
  let cabinetLights: ReturnType<typeof lightCabinet> | null = null;
  const cabinetShadowMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  const cabinetShadows: { book: Book; mesh: THREE.Mesh }[] = [];
  const books: Book[] = [];
  const archive: MasterArchive = buildMasterArchive(issues);
  const masterIssue = archive.issue;
  let shelfBooks: Book[] = [];
  let railLayout = shelfRails<Book>([], false);
  const railOffsets: number[] = [];
  let railMoving = false;
  let shelfPress: { x: number; y: number; row: number; book?: Book; moved: boolean; pointerId: number } | null = null;
  let wheelDistance = 0, lastRailWheel = 0;
  let shelfClip: THREE.Plane[] = [];
  let railRenderBooks: Book[] = [];
  const coverLoads = new Map<Book, Promise<void>>();
  const abort = new AbortController();
  const resources: THREE.Texture[] = [];
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let disposed = false;
  let active: Book | null = null;
  let textures: PageTextures | null = null;
  let mode: ReaderMode = "browsing";
  let error: string | null = null;
  let turned = 0;
  let logical = 0;
  let coverOnly = false;
  let turnCameraStart = 0;
  let zoom = 1;
  let narrow = false;
  let rackNarrow = false;
  let rackWidth = 1, rackHeight = 1;
  let resizePending = false;
  let frameNumber = 0, deformationCount = 0;
  let lastMotion: "drag" | "animation" | null = null;
  const dragFrameTimes: number[] = [];
  const animationFrameTimes: number[] = [];
  const pendingCurl = latestFrameValue<number>();
  let tap: { id: number; x: number; y: number; zone: ReturnType<typeof tapZone>; moved: boolean } | null = null;
  let tapTimer: ReturnType<typeof setTimeout> | null = null;
  let lastTap: { x: number; y: number; time: number } | null = null;
  let qualityPending = false;
  let highDetailPending = false;
  let shelfDistance = 5.5;
  let cameraDistance = 5.5;
  let cameraRise = 0;
  let raf = 0;
  const cabinet = createCabinetMaterials(draw);
  let task = 0;
  let progress = 0;
  let corner = 0;
  let direction: CurlDirection = "forward";
  let movingSheet = 0;
  let currentTurn: ArchiveTurn | null = null;
  let gestureTask = 0;
  let releaseDistance = 1;
  let busyPage = false;
  let hovered: string | null = null;
  let closingRequested = false;
  let lastRender = 0;
  let qualityTier = 0;
  let qualitySamples = 0;
  const frameTimes: number[] = [];
  const renderTimes: number[] = [];
  let animation: { start: number; duration: number; update: (t: number) => void; done: () => void; raw: boolean } | null = null;
  let hintEligible = false;
  let hintVisible = false;
  let hintAcknowledged = false;
  let hintMotion: { start: number; from: number; to: number; duration: number } | null = null;
  const hintTimers = new Set<ReturnType<typeof setTimeout>>();
  const pointers = new Map<number, { x: number; y: number }>();
  let drag: { id: number; x: number; lastX: number; y: number; lastTime: number; velocity: number; distance: number; height: number; corner: number; direction: CurlDirection | null; committed: boolean; progress: number } | null = null;
  let pinch: { distance: number; zoom: number } | null = null;
  let pan = new THREE.Vector2();
  let panLast: THREE.Vector2 | null = null;
  const chapterAt = (index: number) => archive.pages[Math.max(0, Math.min(archive.pages.length - 1, index))];
  function displayPageIndex() {
    return logical;
  }

  const frontGeometry = new THREE.PlaneGeometry(1, 1, 96, 24);
  frontGeometry.translate(0.5, 0, 0);
  const backGeometry = frontGeometry.clone();
  const base = new Float32Array(frontGeometry.attributes.position.array);
  const backUV = backGeometry.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < backUV.count; i++) backUV.setX(i, 1 - backUV.getX(i));
  const paperMaterial = (side: THREE.Side) => new THREE.MeshStandardMaterial({
    color: "#ffffff", roughness: 0.96, metalness: 0, side, shadowSide: THREE.DoubleSide,
  });
  const movingFront = new THREE.Mesh(frontGeometry, paperMaterial(THREE.FrontSide));
  const movingBack = new THREE.Mesh(backGeometry, paperMaterial(THREE.BackSide));
  // The front's double-sided shadow pass already represents the whole thin sheet.
  movingFront.castShadow = true; movingBack.castShadow = false;
  movingFront.receiveShadow = true; movingBack.receiveShadow = true;
  movingFront.frustumCulled = movingBack.frustumCulled = false;
  movingFront.visible = movingBack.visible = false;

  function status() {
    host.dataset.mode = mode;
    const visibleIndex = displayPageIndex();
    host.dataset.page = String(visibleIndex);
    host.dataset.globalPage = String(visibleIndex);
    host.dataset.globalCount = String(archive.pages.length);
    host.dataset.slug = chapterAt(visibleIndex)?.issueSlug || "";
    host.dataset.progress = progress.toFixed(3);
    const meta = active && archive.pages.length ? chapterAt(visibleIndex) : null;
    cb.status({ mode, slug: meta?.issueSlug ?? null, page: meta?.localPageIndex ?? 0, count: meta?.localPageCount ?? 0, zoom, error,
      globalPage: visibleIndex, globalCount: archive.pages.length, issueNumber: meta?.issueNumber, issueIndex: meta?.issueIndex, pageType: meta?.pageType,
      coversPending: shelfBooks.filter(b => !b.cover).length });
  }
  function state(next: ReaderMode) {
    if (!canTransition(mode, next)) throw new Error(`Invalid reader transition: ${mode} -> ${next}`);
    mode = next;
    const shelf = !active || !["reading", "dragging", "settling", "closing"].includes(mode);
    rack.visible = shelf;
    renderer.setClearColor("#0a0a0a", shelf ? 1 : 0);
    books.forEach(book => { if (book !== active) book.group.visible = shelf && railRenderBooks.includes(book) && !!book.cover; });
    status();
  }
  function draw() { if (!disposed && !raf) raf = requestAnimationFrame(tick); }
  function animate(duration: number, update: (t: number) => void, done: () => void, raw = false) {
    animation = { start: performance.now(), duration, update, done, raw }; draw();
  }
  function tick(now: number) {
    raf = 0;
    if (disposed) return;
    const start = performance.now(); frameNumber++;
    if (resizePending && !animation && mode !== "dragging") applyResize();
    const motion = mode === "dragging" ? "drag" : animation ? "animation" : null;
    if (animation) {
      const current = animation;
      const t = clamp01((now - current.start) / current.duration);
      current.update(current.raw ? t : easeInOut(t));
      if (t === 1 && animation === current) { animation = null; current.done(); }
    }
    if (hintMotion) {
      const t = clamp01((now - hintMotion.start) / hintMotion.duration);
      progress = THREE.MathUtils.lerp(hintMotion.from, hintMotion.to, easeInOut(t));
      pendingCurl.set(progress);
      if (t === 1) hintMotion = null;
    }
    const latestCurl = pendingCurl.take();
    if (latestCurl !== undefined && movingFront.visible) deformMesh(latestCurl);
    camera.position.set(0, cameraRise + (active ? 0 : 0.07), cameraDistance);
    camera.lookAt(0, cameraRise, 0);
    const moving = !!animation || mode === "dragging" || pinch !== null || panLast !== null;
    // Change render targets only between gestures; settled text always restores native resolution.
    if (!moving) {
      if (qualityPending) {
        light.shadow.mapSize.setScalar(qualityTier === 1 ? 1024 : 512);
        light.shadow.map?.dispose(); light.shadow.map = null; qualityPending = false;
      }
      if (renderer.getPixelRatio() !== nativePixelRatio) renderer.setPixelRatio(nativePixelRatio);
      if (highDetailPending) { highDetailPending = false; void upgradeDetail(); }
    }
    if (rack.visible) {
      for (const { book, mesh } of cabinetShadows) {
        book.right.updateWorldMatrix(true, false);
        mesh.matrix.copy(book.right.matrixWorld); mesh.visible = book.group.visible;
      }
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.render(cabinetScene, camera);
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.autoClear = false;
      renderer.render(scene, camera);
      renderer.autoClear = true;
    } else renderer.render(scene, camera);
    if (lastRender && motion && motion === lastMotion) {
      const elapsed = now - lastRender;
      const samples = motion === "drag" ? dragFrameTimes : animationFrameTimes;
      if (elapsed < 250 || motion === "animation") {
        samples.push(elapsed); if (samples.length > 600) samples.shift();
        frameTimes.push(elapsed); renderTimes.push(performance.now() - start);
        if (frameTimes.length > 600) { frameTimes.shift(); renderTimes.shift(); }
        qualitySamples++;
        if (qualitySamples >= 20 && qualityTier < 3) {
          const recent = frameTimes.slice(-20).sort((a, b) => a - b);
          if (recent[10] > 25) { qualityTier++; qualitySamples = 0; qualityPending = true; }
        }
      }
    }
    lastRender = motion ? now : 0; lastMotion = motion;
    host.dataset.progress = progress.toFixed(3);
    if (animation || hintMotion) draw();
  }
  function hintAfter(delay: number, run: () => void) {
    const timer = setTimeout(() => { hintTimers.delete(timer); if (!disposed) run(); }, delay);
    hintTimers.add(timer);
  }
  function clearHint(consume = true) {
    if (consume) hintEligible = false;
    hintTimers.forEach(clearTimeout); hintTimers.clear(); hintMotion = null; hintAcknowledged = false;
    if (hintVisible) {
      hintVisible = false; endSheet(); cb.hint?.(null);
    }
  }
  function queueHint(delay = 300) {
    if (!hintEligible || !cb.hint) return;
    clearHint(false);
    hintAfter(delay, () => {
      if (!hintEligible || !active || mode !== "reading" || drag || busyPage || animation) return;
      const next = archiveTurn(logical, archive.pages.length, true, "forward");
      if (!next || next.required.some(index => !textures?.get(index))) return;
      hintEligible = false; hintVisible = true; direction = "forward"; corner = 1;
      // Preview the actual sheet without changing the index or widening the cover camera.
      prepareSheet(0);
      camera.updateMatrixWorld(); active.group.updateWorldMatrix(true, false);
      const edge = active.group.localToWorld(new THREE.Vector3(active.width, -active.height / 2, .013)).project(camera);
      cb.hint?.({ x: Math.max(24, Math.min(canvas.clientWidth - 16, (edge.x + 1) * canvas.clientWidth / 2)),
        y: Math.max(96, Math.min(canvas.clientHeight - 16, (1 - edge.y) * canvas.clientHeight / 2)) });
    });
  }
  function onHintVisible() {
    if (!hintVisible || hintAcknowledged) return;
    hintAcknowledged = true;
    hintMotion = { start: performance.now(), from: 0, to: .18, duration: 550 }; draw();
    hintAfter(4500, () => { hintMotion = { start: performance.now(), from: progress, to: 0, duration: 500 }; draw(); });
    hintAfter(5000, () => clearHint());
  }
  function buildRack() {
    railLayout = shelfRails(books, rackNarrow);
    const layout = buildCabinet(rack, Math.min(books.length, rackNarrow ? 6 : 12), rackNarrow, cabinet.materials);
    const { columns: cols, rows, width, height, rowY, bookX } = layout;
    cabinetLights?.dispose(); cabinetLights = lightCabinet(cabinetScene, layout);
    cabinetShadows.length = 0;
    rackWidth = width; rackHeight = height;
    host.parentElement?.style.setProperty("--cabinet-stage-aspect", String(width / height * .9 / .86));
    host.dataset.cabinetColumns = String(cols); host.dataset.cabinetRows = String(rows);
    shelfClip = [new THREE.Plane(new THREE.Vector3(1, 0, 0), layout.interior / 2 - .025), new THREE.Plane(new THREE.Vector3(-1, 0, 0), layout.interior / 2 - .025)];
    books.forEach(book => {
      const shadow = new THREE.Mesh(book.right.geometry.clone(), cabinetShadowMaterial);
      shadow.matrixAutoUpdate = false; shadow.castShadow = true;
      rack.add(shadow); cabinetShadows.push({ book, mesh: shadow });
    });
    const tan = Math.tan(THREE.MathUtils.degToRad(18));
    shelfDistance = Math.max(height / (2 * tan * .9), width / (2 * tan * camera.aspect * .86));
    railLayout.lanes.forEach((lane, row) => { railOffsets[row] = Math.min(Math.max(0, railOffsets[row] || 0), Math.max(0, lane.length - cols)); });
    positionRails();
    void Promise.all(railRenderBooks.map(loadCover)).then(() => { retainCovers(); status(); }).catch(() => {
      if (!disposed) { error = "An issue cover could not be loaded. The accessible reader is available."; status(); }
    });
  }
  function clipBook(book: Book, enabled: boolean) {
    book.group.traverse(object => {
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => { material.clippingPlanes = enabled ? shelfClip : null; });
      }
    });
  }
  function publishRails() {
    const scale = canvas.clientHeight / (2 * Math.tan(THREE.MathUtils.degToRad(18)) * shelfDistance);
    cb.rails?.(railLayout.lanes.map((lane, row) => ({ row, offset: Math.round(railOffsets[row] || 0), count: lane.length, slots: railLayout.columns,
      top: 50 - ((railLayout.rows - 1) * .89 - row * 1.78 - .79) * scale / canvas.clientHeight * 100, busy: railMoving })), shelfBooks.map(book => book.shelfIssue.slug));
  }
  function positionRails() {
    shelfBooks = []; railRenderBooks = [];
    railLayout.lanes.forEach((lane, row) => lane.forEach((book, index) => {
      const slot = index - (railOffsets[row] || 0);
      const visible = slot > -1 && slot < railLayout.columns;
      const near = slot >= -1 && slot <= railLayout.columns;
      if (visible) shelfBooks.push(book);
      if (near) railRenderBooks.push(book);
      book.home.position.set((slot - (railLayout.columns - 1) / 2) * 1.24 - book.width / 2, (railLayout.rows - 1) * .89 - row * 1.78 - .735 + book.height / 2, .065);
      book.home.rotation.identity();
      if (book !== active) {
        book.group.position.copy(book.home.position); book.group.quaternion.identity(); clipBook(book, true);
        book.group.visible = rack.visible && near && !!book.cover;
      }
    }));
    publishRails(); draw();
  }
  function retainCovers() {
    const keep = new Set([...railRenderBooks, ...(active ? [active] : [])]);
    for (const book of books) if (book.cover && !keep.has(book)) {
      book.cover.dispose(); const index = resources.indexOf(book.cover); if (index >= 0) resources.splice(index, 1);
      book.cover = undefined;
      book.right.material.map = null; book.exterior.material.map = null;
      book.right.material.needsUpdate = book.exterior.material.needsUpdate = true;
    }
    host.dataset.coversLoaded = String(shelfBooks.filter(book => book.cover).length);
  }
  async function slideRow(row: number, step: number) {
    if (mode !== "browsing" || railMoving || !railLayout.lanes[row]) return;
    const lane = railLayout.lanes[row], from = railOffsets[row] || 0;
    const to = Math.max(0, Math.min(lane.length - railLayout.columns, from + step));
    if (to === from) return;
    railMoving = true; hovered = null; publishRails();
    const incoming = lane.slice(Math.max(0, Math.min(from, to) - 1), Math.max(from, to) + railLayout.columns + 1);
    try {
      await Promise.all(incoming.map(loadCover));
      if (disposed || mode !== "browsing") return;
      animate(300, t => { railOffsets[row] = THREE.MathUtils.lerp(from, to, t); positionRails(); }, () => {
        railOffsets[row] = to; railMoving = false; positionRails(); retainCovers(); status();
      });
    } catch {
      railMoving = false; error = "These covers could not be loaded. Please try the shelf again."; publishRails(); status();
    }
  }
  function makeBook(issue: GarmentsIssue) {
    const aspect = issue.height / issue.width;
    const w = Math.min(1, 1.43 / aspect); const h = w * aspect;
    const group = new THREE.Group();
    group.visible = false;
    const leftGroup = new THREE.Group(); const rightGroup = new THREE.Group();
    const staticPage = (x: number) => {
      const geometry = new THREE.PlaneGeometry(w, h, 48, 1);
      const positions = geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) positions.setZ(i, 0.003 * (1 - Math.exp(-Math.abs(positions.getX(i) + x) / 0.02)));
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, paperMaterial(THREE.FrontSide));
      mesh.position.set(x, 0, 0.008); mesh.receiveShadow = true; mesh.castShadow = true; return mesh;
    };
    const left = staticPage(-w / 2); const right = staticPage(w / 2);
    leftGroup.add(left); rightGroup.add(right);
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: "#deded5", roughness: 1 });
    const stack = (x: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w - 0.006, h - 0.008, 0.033), edgeMaterial);
      mesh.position.set(x, 0, -0.012); mesh.receiveShadow = mesh.castShadow = true; return mesh;
    };
    const leftStack = stack(-w / 2); const rightStack = stack(w / 2);
    leftGroup.add(leftStack); rightGroup.add(rightStack);
    // The outside front cover stays on the underside of the turned stack.
    const outsideGeometry = new THREE.PlaneGeometry(w, h);
    const uv = outsideGeometry.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    const exterior = new THREE.Mesh(outsideGeometry, paperMaterial(THREE.BackSide));
    exterior.position.set(-w / 2, 0, -0.032); leftGroup.add(exterior);
    const binding = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, h, 16), edgeMaterial);
    binding.position.z = -0.01;
    group.add(leftGroup, rightGroup, binding); scene.add(group);
    leftGroup.visible = false;
    const book: Book = { issue, shelfIssue: issue, group, leftGroup, rightGroup, left, right, exterior, leftStack, rightStack, width: w, height: h,
      home: { position: new THREE.Vector3(), rotation: new THREE.Quaternion() } };
    group.userData.book = book;
    books.push(book);
  }
  function loadCover(book: Book): Promise<void> {
    if (book.cover) return Promise.resolve();
    const pending = coverLoads.get(book); if (pending) return pending;
    const issue = book.shelfIssue;
    const promise = pageTexture({ ...issue.cover, image: issue.cover.thumbnail || issue.cover.image }, issue, 768, abort.signal).then(texture => {
      if (disposed) { texture.dispose(); return; }
      resources.push(texture); book.cover = texture;
      host.dataset.coversLoaded = String(shelfBooks.filter(b => b.cover).length);
      book.group.visible = active === book || (rack.visible && railRenderBooks.includes(book));
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if (active !== book || !book.right.material.map) map(book.right, texture);
      map(book.exterior, texture); status(); draw();
    }).finally(() => coverLoads.delete(book));
    coverLoads.set(book, promise); return promise;
  }
  issues.forEach(makeBook);

  function map(mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>, texture?: THREE.Texture) {
    if (!texture) return;
    if (mesh.material.map === texture) return;
    const firstMap = !mesh.material.map;
    mesh.material.map = texture; if (firstMap) mesh.material.needsUpdate = true;
  }
  function visiblePages() {
    if (!active || !textures) return;
    const n = sheetCount(active.issue);
    active.leftGroup.visible = !narrow && !coverOnly && turned > 0;
    active.rightGroup.visible = narrow || coverOnly || turned < n;
    map(active.left, textures.get(2 * turned - 1));
    map(active.right, textures.get(narrow || coverOnly ? logical : 2 * turned));
    active.leftStack.scale.z = Math.max(0.08, turned / n);
    active.rightStack.scale.z = Math.max(0.08, (n - turned) / n);
    active.leftGroup.rotation.set(0, 0, 0); active.leftGroup.position.z = 0;
  }
  function keepPages() {
    if (!active || !textures) return [];
    const n = getLogicalPages(active.issue).length;
    return Array.from({ length: 8 }, (_, i) => logical - 3 + i).filter(i => i >= 0 && i < n);
  }
  async function buffer() {
    if (!textures) return;
    const store = textures;
    const position = logical;
    const keep = keepPages();
    await store.ensure(keep);
    if (textures === store && !disposed && mode === "reading" && logical === position) store.retain(keep, narrow ? [logical] : [2 * turned - 1, 2 * turned]);
  }
  function targetX(page = logical) {
    if (!active) return 0;
    if (narrow || coverOnly) return -active.width / 2;
    if (turned === 0 || turned === sheetCount(active.issue)) return (page % 2 ? 0.5 : -0.5) * active.width;
    return 0;
  }
  function readerDistance() {
    if (!active) return shelfDistance;
    const layout = fitReader(canvas.clientWidth, canvas.clientHeight, active.width, active.height);
    narrow = layout.single;
    const scale = coverOnly ? Math.min((canvas.clientWidth - layout.inset * 2) / active.width, (canvas.clientHeight - layout.inset * 2) / active.height) : layout.scale;
    return 1.6 + canvas.clientHeight / (2 * Math.tan(THREE.MathUtils.degToRad(18)) * scale);
  }
  function clampPan() {
    if (!active) return;
    const layout = fitReader(canvas.clientWidth, canvas.clientHeight, active.width, active.height);
    const width = narrow ? active.width : active.width * 2;
    pan.x = boundedPan(pan.x, width, (canvas.clientWidth - layout.inset * 2) / layout.scale, zoom);
    pan.y = boundedPan(pan.y, active.height, (canvas.clientHeight - layout.inset * 2) / layout.scale, zoom);
  }
  function fit() {
    if (!active) return;
    cameraDistance = readerDistance(); clampPan();
    active.group.position.set(targetX() * zoom + pan.x, 1.6 + pan.y, 1.6);
    active.group.quaternion.identity(); active.group.scale.setScalar(zoom);
    cameraRise = 1.6;
    host.dataset.pageWidthPixels = String(canvas.clientHeight / (2 * (cameraDistance - 1.6) * Math.tan(THREE.MathUtils.degToRad(18))) * active.width);
  }
  function startMotion() {
    if (qualityTier >= 3 && renderer.getPixelRatio() !== Math.min(nativePixelRatio, 1.5)) renderer.setPixelRatio(Math.min(nativePixelRatio, 1.5));
  }
  async function select(slug: string) {
    if (disposed || mode !== "browsing" || railMoving) return;
    const book = books.find(b => b.shelfIssue.slug === slug);
    if (!book) return;
    const chapter = archive.chapters.find(entry => entry.issue.slug === slug);
    if (!chapter) return;
    railLayout.lanes.forEach((lane, row) => {
      const index = lane.indexOf(book);
      if (index >= 0 && (index < railOffsets[row] || index >= railOffsets[row] + railLayout.columns)) {
        railOffsets[row] = Math.max(0, Math.min(index, lane.length - railLayout.columns));
      }
    });
    positionRails();
    clipBook(book, false);
    const captureShelf = () => { if (cb.backdrop) {
      try {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.render(cabinetScene, camera); renderer.toneMapping = THREE.NoToneMapping;
        renderer.autoClear = false; renderer.render(scene, camera); renderer.autoClear = true;
        const snapshot = document.createElement("canvas");
        const scale = Math.min(1, 960 / Math.max(canvas.width, canvas.height));
        snapshot.width = Math.max(1, Math.round(canvas.width * scale)); snapshot.height = Math.max(1, Math.round(canvas.height * scale));
        snapshot.getContext("2d")!.drawImage(canvas, 0, 0, snapshot.width, snapshot.height);
        cb.backdrop(snapshot.toDataURL("image/jpeg", .8));
      } catch { renderer.autoClear = true; renderer.toneMapping = THREE.NoToneMapping; }
    } };
    clearHint(); hintEligible = !!cb.hint;
    active = book; active.issue = masterIssue; turned = Math.floor(chapter.startIndex / 2); logical = chapter.startIndex; coverOnly = true; error = null; zoom = 1; pan.set(0, 0);
    hovered = null;
    const token = ++task;
    state("loading");
    textures?.dispose();
    textures = new PageTextures(masterIssue, getLogicalPages(masterIssue), Math.min(2048, renderer.capabilities.maxTextureSize), renderer.capabilities.getMaxAnisotropy());
    try {
      await Promise.all(railRenderBooks.map(loadCover));
      if (disposed || token !== task) return;
      captureShelf();
      await textures.ensure(Array.from({ length: 6 }, (_, i) => chapter.startIndex - 1 + i).filter(index => index >= 0 && index < archive.pages.length));
      if (disposed || task !== token) return;
      map(book.right, textures.get(chapter.startIndex));
      book.group.visible = true;
      book.group.add(movingFront, movingBack);
      cb.selected(slug);
      state("selecting");
      const start = book.group.position.clone(); const rotation = book.group.quaternion.clone();
      const fromCamera = cameraDistance;
      startMotion();
      animate(readerTiming.pickup, t => {
        book.group.position.lerpVectors(start, new THREE.Vector3(-book.width / 2, 1.6, 1.6), t);
        book.group.position.y += Math.sin(Math.PI * t) * 0.25;
        book.group.quaternion.slerpQuaternions(rotation, new THREE.Quaternion(), t);
        cameraDistance = THREE.MathUtils.lerp(fromCamera, readerDistance(), t);
        cameraRise = 1.6 * t;
      }, () => {
        // Arrive on the closed cover. Opening is the reader's first page turn.
        endSheet(); state("reading"); fit();
        void buffer().catch(fail);
        queueHint();
        if (closingRequested) close();
      });
    } catch (e) { if (!disposed && token === task) fail(e); }
  }
  function fail(e: unknown) {
    if (disposed) return;
    clearHint();
    error = e instanceof Error ? e.message : "Page artwork could not be loaded";
    busyPage = false;
    if (mode === "loading" || mode === "reading" || mode === "error") {
      if (mode === "reading") state("loading");
      state("error");
    } else status();
    draw();
  }
  function prepareSheet(p: number) {
    if (!active || !textures) return;
    currentTurn = archiveTurn(logical, archive.pages.length, narrow || coverOnly, direction);
    if (!currentTurn) return;
    movingSheet = currentTurn.sheet;
    turnCameraStart = cameraDistance;
    map(movingFront, textures.get(currentTurn.front)); map(movingBack, textures.get(currentTurn.reverse));
    const { left, right } = currentTurn;
    active.leftGroup.visible = left >= 0;
    active.rightGroup.visible = right < getLogicalPages(active.issue).length;
    map(active.left, textures.get(left)); map(active.right, textures.get(right));
    movingFront.visible = movingBack.visible = true;
    deform(p);
  }
  function deform(p: number) {
    if (active && coverOnly && !narrow && currentTurn) {
      const layout = fitReader(canvas.clientWidth, canvas.clientHeight, active.width, active.height);
      const distance = 1.6 + canvas.clientHeight / (2 * Math.tan(THREE.MathUtils.degToRad(18)) * layout.scale);
      cameraDistance = THREE.MathUtils.lerp(turnCameraStart, distance, p);
    }
    progress = p; pendingCurl.set(p); draw();
  }
  function deformMesh(p: number) {
    if (!active) return;
    deformationCount++;
    const a = frontGeometry.attributes.position as THREE.BufferAttribute;
    const b = backGeometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < a.count; i++) {
      const mirror = currentTurn?.single && direction === "backward";
      const x = base[i * 3] * active.width;
      const cornerWeight = hintVisible ? Math.pow(.5 - base[i * 3 + 1], 4) : 1;
      const point = curlPoint(mirror ? active.width - x : x, base[i * 3 + 1] * active.height, {
        pageWidth: active.width, pageHeight: active.height, progress: p * cornerWeight, direction: currentTurn?.single ? "forward" : direction, cornerBias: corner,
        stiff: !hintVisible && archive.pages[currentTurn?.front ?? movingSheet * 2]?.pageType === "cover",
      });
      // The preview corner lifts inward too, keeping its tip inside full-height views.
      a.setXYZ(i, mirror ? active.width - point.x : point.x, point.y + (hintVisible ? point.z * .7 : 0), point.z + 0.013);
    }
    a.needsUpdate = true;
    frontGeometry.computeVertexNormals();
    const normals = frontGeometry.attributes.normal as THREE.BufferAttribute;
    const backNormals = backGeometry.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < a.count; i++) {
      b.setXYZ(i, a.getX(i) - normals.getX(i) * 0.0012, a.getY(i) - normals.getY(i) * 0.0012, a.getZ(i) - normals.getZ(i) * 0.0012);
      backNormals.setXYZ(i, normals.getX(i), normals.getY(i), normals.getZ(i));
    }
    b.needsUpdate = true; backNormals.needsUpdate = true;
  }
  function endSheet() {
    pendingCurl.clear();
    movingFront.visible = movingBack.visible = false;
    currentTurn = null; visiblePages(); progress = 0; draw();
  }
  function settle(complete: boolean, velocity = 0, automatic = false) {
    if (!active) return;
    const transaction = currentTurn;
    if (!transaction) { endSheet(); state("reading"); return; }
    state("settling");
    const from = progress;
    const book = active;
    const fromX = book.group.position.x;
    let nextLogical = complete ? transaction.destination : logical;
    const nextTurned = Math.ceil(nextLogical / 2);
    if (complete && !transaction.single && archive.pages[nextTurned * 2]?.pageType === "cover") nextLogical = nextTurned * 2;
    const endX = narrow || (!complete && coverOnly) ? -book.width / 2 : nextTurned === 0 || nextTurned === sheetCount(book.issue) ? (nextLogical % 2 ? 0.5 : -0.5) * book.width : 0;
    const duration = releaseDuration(from, complete, velocity, automatic);
    animate(duration, t => {
      deform(releaseProgress(from, complete ? 1 : 0, automatic ? 0 : velocity / releaseDistance, duration, t));
      book.group.position.x = THREE.MathUtils.lerp(fromX, endX, easeInOut(t));
    }, () => {
      if (complete) coverOnly = false;
      turned = nextTurned; logical = nextLogical; endSheet(); state("reading"); fit();
      void buffer().catch(fail);
      if (closingRequested) close();
    }, true);
  }
  function canTurn(d: CurlDirection) {
    return !!active && !!archiveTurn(logical, archive.pages.length, narrow || coverOnly, d);
  }
  async function turn(d: CurlDirection) {
    clearHint();
    if (!active || !textures || mode !== "reading" || busyPage || zoom > 1.01 || !canTurn(d)) return;
    const transaction = archiveTurn(logical, archive.pages.length, narrow || coverOnly, d)!;
    busyPage = true; direction = d; corner = 0.85;
    movingSheet = d === "forward" ? turned : turned - 1;
    const token = task;
    try {
      await textures.ensure(transaction.required);
      if (disposed || token !== task || mode !== "reading") return;
      startMotion(); prepareSheet(0); settle(true, 0, true);
    } catch (e) { fail(e); } finally { busyPage = false; }
  }
  function close() {
    clearHint();
    if (!active || mode === "closing" || mode === "returning") return;
    if (mode === "dragging") { closingRequested = true; drag = null; pointers.clear(); settle(false); return; }
    if ((mode === "loading" || mode === "error") && active.group.position.z < 1) {
      ++task; active.issue = active.shelfIssue; active = null; textures?.dispose(); textures = null; error = null;
      state("browsing"); positionRails(); retainCovers(); cb.closed(); draw(); return;
    }
    if (mode === "selecting" || mode === "opening" || mode === "settling") { closingRequested = true; return; }
    closingRequested = false; ++task; animation = null; drag = null; pointers.clear();
    endSheet(); state("closing");
    const book = active; const startX = book.group.position.x; const startZoom = zoom;
    const startPosition = book.group.position.clone();
    const closingSingle = narrow && !coverOnly;
    if (closingSingle) {
      book.rightGroup.add(book.exterior);
      book.exterior.position.x = book.width / 2;
    }
    // Close the entire turned stack about its binding. Its outside front cover
    // becomes visible naturally; the current printed spread never jumps to page one.
    startMotion();
    animate(coverOnly ? 1 : readerTiming.closing, t => {
      if (closingSingle) book.rightGroup.rotation.y = -Math.PI * t;
      else { book.leftGroup.rotation.y = Math.PI * t; book.leftGroup.position.z = -0.024 * t; }
      book.group.position.x = THREE.MathUtils.lerp(startX, closingSingle ? book.width / 2 : -book.width / 2, t);
      book.group.position.y = THREE.MathUtils.lerp(startPosition.y, 1.6, t);
      book.group.scale.setScalar(THREE.MathUtils.lerp(startZoom, 1, t));
    }, () => {
      zoom = 1; pan.set(0, 0); turned = 0; logical = 0;
      book.rightGroup.rotation.y = 0;
      book.leftGroup.add(book.exterior); book.exterior.position.x = -book.width / 2;
      book.group.position.x = -book.width / 2;
      book.leftGroup.rotation.y = 0; book.leftGroup.position.z = 0; book.leftGroup.visible = false;
      book.issue = book.shelfIssue;
      book.rightGroup.visible = true; map(book.right, book.cover);
      book.rightStack.scale.z = 1; state("returning");
      const start = book.group.position.clone(); const cameraStart = cameraDistance;
      animate(readerTiming.returning, t => {
        book.group.position.lerpVectors(start, book.home.position, t);
        book.group.position.y += Math.sin(Math.PI * t) * 0.2;
        book.group.quaternion.slerpQuaternions(new THREE.Quaternion(), book.home.rotation, t);
        cameraDistance = THREE.MathUtils.lerp(cameraStart, shelfDistance, t);
        cameraRise = 1.6 * (1 - t);
      }, () => {
        movingFront.removeFromParent(); movingBack.removeFromParent();
        active = null; textures?.dispose(); textures = null; error = null; state("browsing"); positionRails(); retainCovers(); cb.closed();
      });
    });
  }
  async function upgradeDetail() {
    if (!active || !textures || zoom === 1 || mode !== "reading") return;
    const store = textures, position = logical;
    try {
      await store.ensure(narrow ? [logical] : [2 * turned - 1, 2 * turned], Math.min(4096, renderer.capabilities.maxTextureSize));
      if (!disposed && textures === store && logical === position && mode === "reading" && !pinch && !panLast) { visiblePages(); draw(); }
    } catch {
      if (!disposed && textures === store) { error = "High-detail artwork could not be loaded. Current pages remain available."; status(); }
    }
  }
  function command(action: ReaderCommand) {
    if (action === "next") void turn("forward");
    if (action === "previous") void turn("backward");
    if (action === "close") close();
    if (action === "retry" && active && mode === "error") {
      if (active.group.position.z > 1) {
        error = null; state("loading");
        void buffer().then(() => { if (!disposed && mode === "loading") { state("reading"); draw(); } }).catch(fail);
        return;
      }
      const slug = active.shelfIssue.slug;
      active.issue = active.shelfIssue;
      active = null; textures?.dispose(); textures = null; state("browsing"); void select(slug);
    }
  }
  function worldPoint(event: { clientX: number; clientY: number }) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const point = new THREE.Vector3();
    ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -(active?.group.position.z ?? 0)), point);
    return active ? active.group.worldToLocal(point) : point;
  }
  function onDown(event: PointerEvent) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    if (mode === "browsing") {
      if (railMoving) return;
      const point = worldPoint(event);
      const hit = ray.intersectObjects(shelfBooks.filter(b => !!b.cover).map(b => b.right), false)[0];
      const book = shelfBooks.find(b => b.right === hit?.object);
      const row = Math.max(0, Math.min(railLayout.rows - 1, Math.round(((railLayout.rows - 1) * .89 - point.y) / 1.78)));
      shelfPress = { x: event.clientX, y: event.clientY, row, book, moved: false, pointerId: event.pointerId };
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (!active || busyPage || (mode !== "reading" && mode !== "dragging")) return;
    clearHint();
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      tap = null; lastTap = null; if (tapTimer) clearTimeout(tapTimer);
      if (drag) { ++gestureTask; drag = null; endSheet(); state("reading"); }
      const p = Array.from(pointers.values());
      pinch = { distance: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), zoom };
      return;
    }
    const rect = canvas.getBoundingClientRect();
    tap = { id: event.pointerId, x: event.clientX, y: event.clientY, zone: tapZone((event.clientX - rect.left) / rect.width), moved: false };
    if (zoom > 1.01) { panLast = new THREE.Vector2(event.clientX, event.clientY); return; }
    const point = worldPoint(event);
    // The grab may begin anywhere over the printed spread, including its trim edge.
    // Clamp the visual corner origin, but never infer turn direction from this point.
    const pixels = canvas.clientHeight / (2 * (cameraDistance - 1.6) * Math.tan(THREE.MathUtils.degToRad(18)));
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastTime: performance.now(), velocity: 0,
      distance: pixels * active.width * (narrow ? .9 : 1.8), height: pixels * active.height,
      corner: Math.max(-.85, Math.min(.85, -Math.max(-active.height / 2, Math.min(active.height / 2, point.y)) / active.height * 1.7)), direction: null, committed: false, progress: 0 };
  }
  function beginGesture(d: CurlDirection) {
    if (!drag || !textures) return;
    const gesture = drag, token = ++gestureTask, store = textures;
    endSheet(); fit(); direction = d;
    gesture.direction = d; gesture.committed = false;
    state("dragging"); startMotion();
    const transaction = archiveTurn(logical, archive.pages.length, narrow || coverOnly, d);
    if (!transaction) {
      // The boundary sheet can resist a pull, but can never commit or wrap.
      currentTurn = { source: logical, destination: logical, direction: d, single: true, sheet: Math.floor(logical / 2), front: logical, reverse: logical, left: -1, right: logical, required: [logical] };
      map(movingFront, store.get(logical)); map(movingBack, store.get(logical));
      movingFront.visible = movingBack.visible = true;
      return;
    }
    const ready = () => {
      if (disposed || token !== gestureTask || drag !== gesture || textures !== store) return;
      gesture.committed = true; prepareSheet(gesture.progress);
    };
    if (transaction.required.every(index => !!store.get(index))) ready();
    else void store.ensure(transaction.required).then(ready).catch(e => {
      if (token !== gestureTask || disposed) return;
      releaseCaptures(); drag = null; endSheet(); state("reading"); fail(e);
    });
  }
  function onMove(event: PointerEvent) {
    if (mode === "browsing") {
      if (shelfPress) { if (Math.hypot(event.clientX - shelfPress.x, event.clientY - shelfPress.y) > 8) shelfPress.moved = true; return; }
      if (railMoving) return;
      worldPoint(event);
      const hit = ray.intersectObjects(shelfBooks.filter(b => !!b.cover).map(b => b.right), false)[0];
      hover(shelfBooks.find(b => b.right === hit?.object)?.shelfIssue.slug ?? null);
      return;
    }
    if (tap?.id === event.pointerId && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 6) tap.moved = true;
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && pointers.size === 2) {
      return;
    }
    if (panLast && zoom > 1 && active) {
      const scale = (cameraDistance - 1.6) * 2 * Math.tan(THREE.MathUtils.degToRad(18)) / canvas.clientHeight;
      pan.x += (event.clientX - panLast.x) * scale;
      pan.y -= (event.clientY - panLast.y) * scale;
      panLast.set(event.clientX, event.clientY); fit(); draw(); return;
    }
    if (!drag || event.pointerId !== drag.id || !["reading", "dragging"].includes(mode)) return;
    const now = performance.now();
    const elapsed = Math.max(1, now - drag.lastTime);
    const velocity = (event.clientX - drag.lastX) / elapsed;
    drag.velocity = elapsed > 100 ? velocity : drag.velocity * .35 + velocity * .65;
    drag.lastX = event.clientX; drag.lastTime = now;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    const threshold = event.pointerType === "mouse" ? 10 : Math.max(10, Math.min(20, canvas.clientWidth * .028));
    const liveDirection = gestureDirection(dx, dy, threshold);
    if (liveDirection && liveDirection !== drag.direction) beginGesture(liveDirection);
    if (!drag.direction) return;
    const pull = dragCurl(dx, dy, drag.distance, drag.height, drag.corner, drag.direction);
    corner = pull.cornerBias;
    drag.progress = pull.progress;
    if (currentTurn) deform(drag.committed ? pull.progress : Math.min(.09, pull.progress * .12));
  }
  function handleTap(event: PointerEvent, zone: ReturnType<typeof tapZone>) {
    const now = performance.now();
    if (lastTap && now - lastTap.time < 280 && Math.hypot(lastTap.x - event.clientX, lastTap.y - event.clientY) < 30) {
      if (tapTimer) clearTimeout(tapTimer);
      lastTap = null; cb.centreTap?.(); return;
    }
    lastTap = { x: event.clientX, y: event.clientY, time: now };
    if (tapTimer) clearTimeout(tapTimer);
    tapTimer = setTimeout(() => {
      lastTap = null;
      if (disposed || mode !== "reading") return;
      if (zone === "centre" || zoom > 1) cb.centreTap?.();
    }, 280);
  }
  function release(event: PointerEvent, cancel = false) {
    if (shelfPress?.pointerId === event.pointerId) {
      const pressed = shelfPress; shelfPress = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (!cancel) {
        const dx = event.clientX - pressed.x, dy = event.clientY - pressed.y;
        if (pressed.moved && Math.abs(dx) > 24 && Math.abs(dx) > Math.abs(dy) * 1.12) void slideRow(pressed.row, dx < 0 ? railLayout.columns : -railLayout.columns);
        else if (!pressed.moved && pressed.book) void select(pressed.book.shelfIssue.slug);
      }
      return;
    }
    pointers.delete(event.pointerId);
    const gestureTap = tap?.id === event.pointerId ? tap : null;
    tap = null;
    if (pinch) {
      if (pointers.size === 0) { pinch = null; panLast = null; highDetailPending = zoom > 1; draw(); }
    } else {
      panLast = null;
      if (drag?.id === event.pointerId) {
        const gestureDrag = drag;
        const velocity = performance.now() - gestureDrag.lastTime > 100 ? 0 : (gestureDrag.direction === "forward" ? -gestureDrag.velocity : gestureDrag.velocity);
        const wasTap = gestureTap && !gestureTap.moved && progress < .02;
        releaseDistance = gestureDrag.distance; ++gestureTask; drag = null;
        if (wasTap && !cancel) handleTap(event, gestureTap.zone);
        else if (gestureDrag.direction) settle(!cancel && gestureDrag.committed && shouldCompleteTurn(progress, velocity), velocity);
      } else if (gestureTap && !cancel) {
        if (!gestureTap.moved) handleTap(event, gestureTap.zone);
      }
      if (zoom > 1) { highDetailPending = true; draw(); }
    }
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }
  const onUp = (e: PointerEvent) => release(e);
  const onCancel = (e: PointerEvent) => release(e, true);
  function hover(slug: string | null) {
    if (mode !== "browsing" || railMoving || shelfPress || hovered === slug) return;
    hovered = slug;
    const starts = shelfBooks.map(book => book.group.position.clone());
    animate(160, t => shelfBooks.forEach((book, i) => {
      const target = book.home.position.clone();
      if (book.shelfIssue.slug === slug) { target.y += 0.04; target.z += 0.025; }
      book.group.position.lerpVectors(starts[i], target, t);
    }), () => {});
  }
  const onLeave = () => hover(null);
  function onWheel(event: WheelEvent) {
    if (mode !== "browsing") return;
    const dx = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
    if (Math.abs(dx) <= (event.shiftKey ? 0 : Math.abs(event.deltaY) * 1.12)) return;
    const point = worldPoint(event);
    const row = Math.max(0, Math.min(railLayout.rows - 1, Math.round(((railLayout.rows - 1) * .89 - point.y) / 1.78)));
    if (railLayout.lanes[row].length <= railLayout.columns) return;
    event.preventDefault();
    if (railMoving || performance.now() - lastRailWheel < 450) return;
    wheelDistance += dx * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientWidth : 1);
    if (Math.abs(wheelDistance) >= 48) {
      lastRailWheel = performance.now(); const step = Math.sign(wheelDistance) * railLayout.columns; wheelDistance = 0;
      void slideRow(row, step);
    }
  }
  function releaseCaptures() {
    const ids = Array.from(pointers.keys()); pointers.clear();
    for (const id of ids) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  function cancelGesture() {
    clearHint();
    ++gestureTask;
    const hadDrag = drag; drag = null;
    if (shelfPress) {
      const id = shelfPress.pointerId; shelfPress = null;
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    }
    releaseCaptures(); pinch = null; panLast = null; tap = null; lastTap = null;
    if (tapTimer) clearTimeout(tapTimer);
    if (hadDrag) settle(false);
  }
  function onKey(event: KeyboardEvent) {
    if (!active || /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement)?.tagName)) return;
    if (event.key === "Escape") { event.preventDefault(); close(); }
    if (event.key === "ArrowRight") { event.preventDefault(); void turn("forward"); }
    if (event.key === "ArrowLeft") { event.preventDefault(); void turn("backward"); }
  }
  function applyResize() {
    resizePending = false;
    const rect = host.getBoundingClientRect();
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
    camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height); camera.updateProjectionMatrix();
    if (!active) {
      const changed = rackNarrow !== (rect.width < 640);
      rackNarrow = rect.width < 640;
      if (changed || !rack.children.length) buildRack();
      const tan = Math.tan(THREE.MathUtils.degToRad(18));
      shelfDistance = Math.max(rackHeight / (2 * tan * .9), rackWidth / (2 * tan * camera.aspect * .86));
      cameraDistance = shelfDistance;
      publishRails();
    } else if (mode === "reading" || mode === "opening") { fit(); turned = Math.ceil(logical / 2); visiblePages(); void buffer().catch(fail); }
    else if (mode === "returning") {
      const tan = Math.tan(THREE.MathUtils.degToRad(18));
      shelfDistance = Math.max(rackHeight / (2 * tan * .9), rackWidth / (2 * tan * camera.aspect * .86));
    }
  }
  function resize() {
    if (hintVisible) clearHint();
    if (drag || pinch || panLast) cancelGesture();
    if (animation && !["selecting", "opening", "returning"].includes(mode)) resizePending = true;
    else applyResize();
    draw();
  }
  const onContextLost = (event: Event) => { event.preventDefault(); cb.fallback(); };
  const onViewport = (event: Event) => {
    if ((event as CustomEvent<boolean>).detail && mode === "reading") { clearHint(false); state("opening"); }
    else if (!(event as CustomEvent<boolean>).detail && mode === "opening") {
      fit(); visiblePages(); state("reading"); draw(); queueHint(100); if (closingRequested) close();
    }
  };
  host.addEventListener("garments:viewport", onViewport);
  host.addEventListener("garments:hint-visible", onHintVisible);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);
  canvas.addEventListener("lostpointercapture", onCancel);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("webglcontextlost", onContextLost);
  window.addEventListener("keydown", onKey);
  window.addEventListener("blur", cancelGesture);
  const observer = new ResizeObserver(resize); observer.observe(host);
  resize(); status();
  return {
    select, command, hover, resize, slideRow,
    metrics: () => {
      const gl = renderer.getContext();
      const debug = gl.getExtension("WEBGL_debug_renderer_info");
      return { frameNumber, deformationCount, zoom, turn: currentTurn, coverTextures: books.filter(book => book.cover).length, dragFrameTimes: [...dragFrameTimes], animationFrameTimes: [...animationFrameTimes], frameTimes: [...frameTimes], renderTimes: [...renderTimes], triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, pageTextureSizes: textures?.sizes() || [], pixelRatio: renderer.getPixelRatio(), shadowSize: light.shadow.mapSize.x, qualityTier, renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
    },
    dispose() {
      disposed = true; ++task; abort.abort(); animation = null;
      clearHint();
      ++gestureTask; drag = null; releaseCaptures();
      if (tapTimer) clearTimeout(tapTimer); pendingCurl.clear();
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect(); textures?.dispose();
      host.removeEventListener("garments:viewport", onViewport);
      host.removeEventListener("garments:hint-visible", onHintVisible);
      window.removeEventListener("keydown", onKey); window.removeEventListener("blur", cancelGesture);
      canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp); canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("lostpointercapture", onCancel); canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
      const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
        }
      });
      geometries.add(frontGeometry); geometries.add(backGeometry);
      materials.add(movingFront.material); materials.add(movingBack.material);
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      rack.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
      cabinetLights?.dispose();
      cabinetShadowMaterial.dispose();
      resources.forEach(t => t.dispose()); cabinet.dispose(); light.shadow.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}
