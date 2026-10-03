import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function cabinetLayout(count: number, mobile: boolean) {
  const columns = Math.min(count <= 4 || mobile ? 2 : 4, Math.max(1, count));
  const rows = Math.ceil(Math.max(1, count) / columns);
  const interior = columns * 1.24 + .14;
  const opening = rows * 1.78;
  return { columns, rows, interior, opening, width: interior + .98, height: opening + 1.62,
    rowY: (row: number) => (rows - 1) * .89 - row * 1.78,
    bookX: (index: number) => (index % columns - (columns - 1) / 2) * 1.24 };
}

export function createCabinetMaterials(onLoad: () => void) {
  let disposed = false;
  const fallback = new THREE.DataTexture(new Uint8Array([62, 32, 20, 255]), 1, 1);
  fallback.colorSpace = THREE.SRGBColorSpace; fallback.needsUpdate = true;
  const textures: THREE.Texture[] = [fallback];
  const timber = new THREE.MeshPhysicalMaterial({ color: "#ffffff", map: fallback, roughness: .46, clearcoat: .18, clearcoatRoughness: .4, specularIntensity: .4 });
  const interior = timber.clone(); interior.color.set("#e4cbb4"); interior.roughness = .65; interior.clearcoat = .12;
  const trim = timber.clone(); trim.color.set("#ffe8d2"); trim.roughness = .38; trim.clearcoat = .24;
  const brass = new THREE.MeshStandardMaterial({ color: "#d8ad60", metalness: .92, roughness: .24 });
  // A small studio reflection field lights the furniture without adding a visible room.
  const pixels = new Float32Array(128 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) {
    const key = Math.exp(-(((x - 35) / 11) ** 2) - ((y - 23) / 15) ** 2) * 5;
    const fill = Math.exp(-(((x - 91) / 7) ** 2) - ((y - 30) / 20) ** 2) * 2;
    const i = (y * 128 + x) * 4;
    pixels[i] = .12 + key + fill; pixels[i + 1] = .11 + key * .86 + fill * .97;
    pixels[i + 2] = .10 + key * .7 + fill; pixels[i + 3] = 1;
  }
  const reflection = new THREE.DataTexture(pixels, 128, 64, THREE.RGBAFormat, THREE.FloatType);
  reflection.mapping = THREE.EquirectangularReflectionMapping;
  reflection.needsUpdate = true; textures.push(reflection);
  for (const material of [timber, interior, trim, brass]) { material.envMap = reflection; material.envMapIntensity = material === brass ? .8 : .18; }
  const materials = { timber, interior, trim, brass };
  const loader = new THREE.TextureLoader();
  const load = (file: string, normal: boolean) => {
    loader.load(`/garments/materials/${file}`, texture => {
      if (disposed) { texture.dispose(); return; }
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 4;
      if (!normal) texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      for (const material of [timber, interior, trim]) {
        if (normal) { material.normalMap = texture; material.normalScale.set(.14, .14); }
        else material.map = texture;
        material.needsUpdate = true;
      }
      onLoad();
    }, undefined, () => { /* Timber remains visible if an optional material map fails. */ });
  };
  load("walnut-grain.jpg", false); load("walnut-normal.jpg", true);
  return { materials, dispose() { disposed = true; textures.forEach(t => t.dispose()); Object.values(materials).forEach(m => m.dispose()); } };
}

export function lightCabinet(scene: THREE.Scene, layout: ReturnType<typeof cabinetLayout>) {
  const rig = new THREE.Group();
  const key = new THREE.DirectionalLight("#ffe3c7", 5);
  key.position.set(-3, 5, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const bound = Math.max(layout.width, layout.height) * .7;
  Object.assign(key.shadow.camera, { left: -bound, right: bound, top: bound, bottom: -bound, near: .1, far: 25 });
  key.shadow.normalBias = .006; key.shadow.bias = -.00008; key.shadow.radius = 3;
  const fill = new THREE.DirectionalLight("#e4eaff", .65); fill.position.set(4, 1, 5);
  rig.add(key, fill, new THREE.HemisphereLight("#ffe9d4", "#261a13", .7));
  for (let row = 0; row < layout.rows; row++) {
    for (const sign of [-1, 1]) {
      const lamp = new THREE.SpotLight("#ffd19b", 1.8, 2.5, 1.15, 1, 2);
      lamp.position.set(sign * layout.interior * .27, layout.rowY(row) + .78, .12);
      lamp.target.position.set(sign * layout.interior * .27, layout.rowY(row) - .1, -.32);
      rig.add(lamp, lamp.target);
    }
  }
  scene.add(rig);
  return { shadow: key.shadow, dispose() { scene.remove(rig); key.shadow.dispose(); } };
}

type Materials = ReturnType<typeof createCabinetMaterials>["materials"];

export function buildCabinet(rack: THREE.Group, count: number, mobile: boolean, materials: Materials) {
  rack.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
  rack.clear();
  const layout = cabinetLayout(count, mobile);
  const { interior: width, opening: height, rows, rowY } = layout;
  const batches = new Map<keyof Materials, THREE.BufferGeometry[]>();
  const add = (geometry: THREE.BufferGeometry, material: keyof Materials, x: number, y: number, z: number, rotation = 0) => {
    geometry.rotateZ(rotation); geometry.translate(x, y, z);
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();
    const batch = batches.get(material) || []; batch.push(flat); batches.set(material, batch);
  };
  const board = (w: number, h: number, d: number, x: number, y: number, z: number, material: keyof Materials = "timber", vertical = h > w) => {
    const geometry = new RoundedBoxGeometry(w, h, d, 1, Math.min(.012, w / 6, h / 6, d / 6));
    // Grain is mapped in physical units, not stretched once across each board.
    const p = geometry.attributes.position, n = geometry.attributes.normal, uv = geometry.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const cross = Math.abs(n.getX(i)) > .7 ? p.getZ(i) : p.getX(i);
      const along = Math.abs(n.getY(i)) > .7 ? p.getZ(i) : p.getY(i);
      uv.setXY(i, (vertical ? cross : along) * .9 + x * .23, (vertical ? along : cross) * .65 + y * .19);
    }
    add(geometry, material, x, y, z);
  };
  const moulding = (w: number, y: number, z: number, weight = 1) => {
    board(w, .035 * weight, .5, 0, y - .06 * weight, z, "trim");
    board(w + .055, .065 * weight, .55, 0, y - .014 * weight, z + .015);
    board(w + .11, .027 * weight, .59, 0, y + .033 * weight, z + .025, "trim");
  };
  const top = height / 2, bottom = -height / 2;
  // Recessed panel joints and stepped inner reveals, with no doors or glazing.
  const panels = Math.ceil(width / .44);
  for (let i = 0; i < panels; i++) board(width / panels - .003, height, .065, -width / 2 + (i + .5) * width / panels, 0, -.32, "interior", true);
  for (const sign of [-1, 1]) {
    board(.14, height + .08, .46, sign * (width / 2 + .045), 0, -.11, "interior");
    board(.045, height, .055, sign * (width / 2 - .025), 0, -.03, "trim");
  }
  board(width + .6, .31, .55, 0, top + .145, -.08);
  moulding(width + .57, top + .31, -.045);
  board(width + .71, .105, .59, 0, top + .415, -.06);
  const teeth = Math.floor((width + .6) / .09);
  for (let i = 0; i < teeth; i++) board(.048, .053, .07, (i - (teeth - 1) / 2) * .09, top + .39, .26, "trim");
  moulding(width + .71, top + .525, -.015, 1.6);
  board(width + .98, .048, .72, 0, top + .64, .01, "trim");
  // Built-in shelves and pencil-thin aged brass rails sit below cover artwork.
  for (let row = 0; row < rows; row++) {
    const y = rowY(row) - .79;
    board(width, .10, .50, 0, y, -.04);
    board(width, .024, .035, 0, y + .06, .21, "trim");
    board(width, .029, .04, 0, y - .063, .205, "trim");
    const rail = new THREE.CylinderGeometry(.011, .011, width - .08, 20);
    add(rail, "brass", 0, y + .115, .225, Math.PI / 2);
    for (const sign of [-1, 1]) {
      add(new THREE.CylinderGeometry(.014, .017, .16, 12), "brass", sign * (width / 2 - .045), y + .08, .225);
      add(new THREE.SphereGeometry(.018, 10, 6), "brass", sign * (width / 2 - .045), y + .16, .225);
    }
  }
  const rosette = (x: number, y: number) => {
    board(.265, .245, .12, x, y, .18);
    board(.21, .19, .023, x, y, .251, "interior");
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const petal = new THREE.SphereGeometry(1, 8, 6); petal.scale(.015, .046, .012);
      add(petal, "trim", x + Math.sin(angle) * .052, y + Math.cos(angle) * .052, .27, -angle);
    }
    add(new THREE.SphereGeometry(.023, 12, 8), "timber", x, y, .281);
    for (const dy of [-.14, .14]) board(.30, .025, .20, x, y + dy, .18, "trim");
  };
  for (const sign of [-1, 1]) {
    const x = sign * (width / 2 + .17);
    board(.27, height + .88, .48, x, -.02, .02);
    for (let row = 0; row < rows; row++) {
      const y = rowY(row);
      // Concave flute profile, physically recessed into each pilaster face.
      for (let flute = -1; flute <= 1; flute++) {
        const geometry = new THREE.PlaneGeometry(.048, 1.33, 12, 1);
        const p = geometry.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, -.015 * Math.cos(p.getX(i) / .048 * Math.PI));
        geometry.computeVertexNormals();
        add(geometry, "interior", x + flute * .069, y - .08, .265);
        for (const dx of [-.026, .026]) board(.008, 1.34, .019, x + flute * .069 + dx, y - .08, .265, "trim");
      }
      rosette(x, y + .73);
      board(.31, .045, .46, x, y - .80, .07, "trim");
    }
    for (const y of [top + .5, bottom - .78]) {
      board(.37, .14, .57, x, y, .045);
      board(.41, .035, .60, x, y + .083, .05, "trim");
    }
  }
  // Raised apron panel above a broad, layered furniture plinth.
  board(width + .59, .70, .54, 0, bottom - .37, -.045);
  board(width - .12, .43, .038, 0, bottom - .36, .235, "interior", false);
  for (const dy of [-.24, .24]) board(width, .035, .055, 0, bottom - .36 + dy, .26, "trim");
  for (const sign of [-1, 1]) board(.035, .48, .055, sign * (width / 2 - .014), bottom - .36, .26, "trim");
  moulding(width + .63, bottom - .73, .005, 1.4);
  board(width + .84, .13, .68, 0, bottom - .865, .005);
  for (const [key, geometries] of Array.from(batches)) {
    const merged = mergeGeometries(geometries); geometries.forEach(g => g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, materials[key]); mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = `cabinet-${key}`; rack.add(mesh);
  }
  return layout;
}
