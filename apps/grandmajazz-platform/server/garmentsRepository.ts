import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { draftSchema, type Edition } from "../shared/garments-management";
import { blankPage, getLogicalPages, parseManifest, type GarmentsIssue, type GarmentsManifest } from "../client/src/garments/issues";

export class ManagementError extends Error { constructor(public status: number, message: string) { super(message); } }
type Connection = Pool | PoolClient;
export class GarmentsRepository {
  constructor(public pool: Pool) {}
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query("BEGIN"); const result = await fn(client); await client.query("COMMIT"); return result; }
    catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async audit(client: Connection, actor: string | null, edition: string | null, action: string, details = {}) {
    await client.query("INSERT INTO gj_garments_audit(id,actor_id,edition_id,action,details) VALUES($1,$2,$3,$4,$5)", [randomUUID(), actor, edition, action, JSON.stringify(details)]);
  }
  async registerAssets(client: Connection, pages: any[], jobId: string | null, width = 800, height = 1132) {
    const result = [];
    for (const page of pages) {
      if (!page.image) { result.push(page); continue; }
      const row = await client.query("INSERT INTO gj_garments_assets(id,image,thumbnail,width,height,job_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(image) DO UPDATE SET image=EXCLUDED.image RETURNING *", [randomUUID(), page.image, page.thumbnail || null, Math.round(page.width || width), Math.round(page.height || height), jobId]);
      result.push({ ...page, assetId: row.rows[0].id });
    }
    return result;
  }
  async references(client: Connection, revision: string, document: GarmentsIssue) {
    await client.query("DELETE FROM gj_garments_revision_assets WHERE revision_id=$1", [revision]);
    for (const asset of Array.from(new Set(getLogicalPages(document).flatMap(p => p.assetId ? [p.assetId] : [])))) {
      await client.query("INSERT INTO gj_garments_revision_assets(revision_id,asset_id) VALUES($1,$2)", [revision, asset]);
    }
  }
  async importManifest(manifest: GarmentsManifest) {
    await this.transaction(async client => {
      await client.query("SELECT pg_advisory_xact_lock(7612901)");
      if ((await client.query("SELECT id FROM gj_garments_settings WHERE id=1")).rowCount) return;
      const parsed = parseManifest(manifest);
      for (const original of parsed.issues) {
        const document = structuredClone(original);
        const faces = [document.cover, ...document.pages, document.backCover];
        const prepared = [];
        for (const face of faces) {
          const match = face.image?.match(/^\/garments\/media\/([a-f0-9-]{36})\//);
          const jobId = match?.[1] || null;
          if (jobId) await client.query("INSERT INTO gj_garments_jobs(id,filename,state) VALUES($1,'Imported artwork','ready') ON CONFLICT DO NOTHING", [jobId]);
          prepared.push(...await this.registerAssets(client, [face], jobId, document.width, document.height));
        }
        document.cover = prepared[0]; document.pages = prepared.slice(1, -1); document.backCover = prepared[prepared.length - 1];
        const revision = randomUUID();
        await client.query("INSERT INTO gj_garments_editions(id,slug,status,draft_id,published_id) VALUES($1,$2,'published',$3,$3)", [document.id, document.slug, revision]);
        await client.query("INSERT INTO gj_garments_revisions(id,edition_id,document,published_at) VALUES($1,$2,$3,now())", [revision, document.id, JSON.stringify(document)]);
        await this.references(client, revision, document);
      }
      await client.query("INSERT INTO gj_garments_settings(id,value) VALUES(1,$1)", [JSON.stringify({ logo: parsed.logo, enquiryUrl: parsed.enquiryUrl })]);
      await this.audit(client, null, null, "archive.imported", { count: parsed.issues.length });
    });
  }
  async publicManifest(archive = false, slug?: string): Promise<GarmentsManifest> {
    const settings = (await this.pool.query("SELECT value FROM gj_garments_settings WHERE id=1")).rows[0]?.value || { logo: null };
    const rows = await this.pool.query("SELECT r.document FROM gj_garments_editions e JOIN gj_garments_revisions r ON r.id=e.published_id WHERE ($1::text IS NULL AND e.status=$2) OR ($1::text IS NOT NULL AND e.slug=$1 AND e.status IN ('published','archived')) ORDER BY e.created_at ASC", [slug || null, archive ? "archived" : "published"]);
    return { ...settings, issues: rows.rows.map(r => r.document) };
  }
  private result(row: any): Edition {
    return { id: row.id, slug: row.slug, status: row.status, version: row.version, document: row.document, updatedAt: row.updated_at.toISOString(), updatedBy: row.updated_by_name, hasChanges: row.draft_id !== row.published_id, trashedAt: row.trashed_at?.toISOString() || null };
  }
  async list(status: string) {
    const rows = await this.pool.query("SELECT e.*,r.document,u.name AS updated_by_name FROM gj_garments_editions e JOIN gj_garments_revisions r ON r.id=e.draft_id LEFT JOIN ev_users u ON u.id=e.updated_by WHERE e.status=$1 ORDER BY e.updated_at DESC", [status]);
    return rows.rows.map(r => this.result(r));
  }
  async get(id: string, connection: Connection = this.pool): Promise<Edition> {
    const rows = await connection.query("SELECT e.*,r.document,u.name AS updated_by_name FROM gj_garments_editions e JOIN gj_garments_revisions r ON r.id=e.draft_id LEFT JOIN ev_users u ON u.id=e.updated_by WHERE e.id=$1", [id]);
    if (!rows.rowCount) throw new ManagementError(404, "Edition not found");
    return this.result(rows.rows[0]);
  }
  async create(actor: string) {
    const id = randomUUID(), revision = randomUUID();
    const document: GarmentsIssue = { id, slug: `edition-${id.slice(0, 8)}`, title: "Untitled edition", issueNumber: "", publicationDate: new Date().toISOString().slice(0, 10), width: 800, height: 1132, cover: { ...blankPage, id: "front" }, pages: [], backCover: { ...blankPage, id: "back" }, blankColor: "paper" };
    return this.transaction(async c => {
      await c.query("INSERT INTO gj_garments_editions(id,slug,status,draft_id,updated_by) VALUES($1,$2,'draft',$3,$4)", [id, document.slug, revision, actor]);
      await c.query("INSERT INTO gj_garments_revisions(id,edition_id,document,created_by) VALUES($1,$2,$3,$4)", [revision, id, JSON.stringify(document), actor]);
      await this.audit(c, actor, id, "edition.created");
      return this.get(id, c);
    });
  }
  private async locked(c: PoolClient, id: string, version: number) {
    const row = (await c.query("SELECT * FROM gj_garments_editions WHERE id=$1 FOR UPDATE", [id])).rows[0];
    if (!row) throw new ManagementError(404, "Edition not found");
    if (row.version !== version) throw new ManagementError(409, "Another editor changed this edition. Reload the saved version before continuing.");
    return row;
  }
  private async normalise(c: PoolClient, input: unknown, edition: any): Promise<GarmentsIssue> {
    const document = draftSchema.parse(input);
    document.id = edition.id; document.slug = edition.slug;
    if (document.isDevelopmentFixture || getLogicalPages(document).some(p => p.fixture)) throw new ManagementError(400, "Development fixtures cannot be saved");
    for (const face of [document.cover, ...document.pages, document.backCover]) {
      if (face.blank) { delete face.image; delete face.thumbnail; delete face.assetId; face.blankColor = document.blankColor || "paper"; continue; }
      const asset = (await c.query("SELECT * FROM gj_garments_assets WHERE image=$1 AND ($2::uuid IS NULL OR id=$2)", [face.image || "", face.assetId || null])).rows[0];
      if (!asset) throw new ManagementError(400, "Artwork is missing or still converting");
      face.assetId = asset.id; face.thumbnail = asset.thumbnail || undefined;
      if (face === document.cover) { document.width = asset.width; document.height = asset.height; }
    }
    return document;
  }
  private async writeDraft(c: PoolClient, edition: any, document: GarmentsIssue, actor: string) {
    const revision = edition.draft_id === edition.published_id || !edition.draft_id ? randomUUID() : edition.draft_id;
    const immutable = (await c.query("SELECT published_at FROM gj_garments_revisions WHERE id=$1", [revision])).rows[0]?.published_at;
    const target = immutable ? randomUUID() : revision;
    await c.query("INSERT INTO gj_garments_revisions(id,edition_id,document,created_by) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET document=EXCLUDED.document,created_by=EXCLUDED.created_by", [target, edition.id, JSON.stringify(document), actor]);
    await this.references(c, target, document);
    await c.query("UPDATE gj_garments_editions SET draft_id=$2,version=version+1,updated_at=now(),updated_by=$3 WHERE id=$1", [edition.id, target, actor]);
  }
  async save(id: string, version: number, input: unknown, actor: string) {
    return this.transaction(async c => {
      const edition = await this.locked(c, id, version);
      if (edition.status === "trash") throw new ManagementError(409, "Restore this edition before editing");
      await this.writeDraft(c, edition, await this.normalise(c, input, edition), actor);
      await this.audit(c, actor, id, "draft.saved");
      return this.get(id, c);
    });
  }
  async action(id: string, version: number, action: string, actor: string) {
    return this.transaction(async c => {
      const edition = await this.locked(c, id, version);
      let status = edition.status, published = edition.published_id, trashed = edition.trashed_at;
      if (action === "publish") {
        if (status === "trash") throw new ManagementError(409, "Restore this edition first");
        const document = (await c.query("SELECT document FROM gj_garments_revisions WHERE id=$1", [edition.draft_id])).rows[0].document;
        parseManifest({ logo: null, issues: [document] });
        if (!document.title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(document.publicationDate)) throw new ManagementError(400, "Enter an edition title and publication date");
        if (!getLogicalPages(document).some(p => p.image)) throw new ManagementError(400, "Add artwork before publishing");
        published = edition.draft_id; status = status === "archived" ? "archived" : "published";
        await c.query("UPDATE gj_garments_revisions SET published_at=COALESCE(published_at,now()) WHERE id=$1", [published]);
      } else if (action === "archive" && status === "published") status = "archived";
      else if (action === "unpublish" && ["published", "archived"].includes(status)) { status = "draft"; published = null; }
      else if (action === "trash" && status !== "trash") { status = "trash"; trashed = new Date(); }
      else if (action === "restore" && ["trash", "archived"].includes(status)) { if (status === "trash") { status = "draft"; published = null; trashed = null; } else status = "published"; }
      else throw new ManagementError(409, "This action is not available for the current edition state");
      await c.query("UPDATE gj_garments_editions SET status=$2,published_id=$3,trashed_at=$4,version=version+1,updated_at=now(),updated_by=$5 WHERE id=$1", [id, status, published, trashed, actor]);
      await this.audit(c, actor, id, `edition.${action}`);
      return this.get(id, c);
    });
  }
  async history(id: string) {
    return (await this.pool.query("SELECT r.id,r.created_at AS \"createdAt\",r.published_at AS \"publishedAt\",r.document->>'title' AS title,u.name AS author FROM gj_garments_revisions r LEFT JOIN ev_users u ON u.id=r.created_by WHERE r.edition_id=$1 AND r.published_at IS NOT NULL ORDER BY r.published_at DESC", [id])).rows;
  }
  async restoreRevision(id: string, version: number, revision: string, actor: string) {
    return this.transaction(async c => {
      const edition = await this.locked(c, id, version);
      if (edition.status === "trash") throw new ManagementError(409, "Restore this edition first");
      const row = (await c.query("SELECT document FROM gj_garments_revisions WHERE edition_id=$1 AND id=$2 AND published_at IS NOT NULL", [id, revision])).rows[0];
      if (!row) throw new ManagementError(404, "Revision not found");
      await this.writeDraft(c, edition, row.document, actor); await this.audit(c, actor, id, "revision.restored", { revision });
      return this.get(id, c);
    });
  }
  async remove(id: string, version: number, title: string, actor: string) {
    await this.transaction(async c => {
      const edition = await this.locked(c, id, version);
      const row = (await c.query("SELECT document FROM gj_garments_revisions WHERE id=$1", [edition.draft_id])).rows[0];
      if (edition.status !== "trash" || row.document.title !== title) throw new ManagementError(400, "Move the edition to Trash and enter its exact title to delete it");
      await this.audit(c, actor, id, "edition.deleted"); await c.query("DELETE FROM gj_garments_editions WHERE id=$1", [id]);
    });
  }
  async publicAsset(image: string) {
    return !!(await this.pool.query("SELECT 1 FROM gj_garments_assets a JOIN gj_garments_revision_assets ra ON ra.asset_id=a.id JOIN gj_garments_editions e ON e.published_id=ra.revision_id WHERE (a.image=$1 OR a.thumbnail=$1) AND e.status IN ('published','archived') LIMIT 1", [image])).rowCount;
  }
}
