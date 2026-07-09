import "server-only";
import { createSupabaseServerClient } from "./server";
import { BUCKETS, isSupabaseEnabled } from "./config";

/**
 * Dual-mode file storage.
 *
 *   • SUPABASE mode — uploads bytes to a Storage bucket under an org-scoped
 *     path (`<orgId>/<scope>/<file>`) so the storage RLS policies in migration
 *     0003 can enforce tenant isolation. Returns a durable reference.
 *   • DEMO mode     — returns a base64 data URL so the in-memory store keeps
 *     working with zero infrastructure (matches the original demo behaviour).
 *
 * Reference format returned in `url`:
 *   - public buckets  → the public https URL (stable, no expiry)
 *   - private buckets → `storage:<bucket>/<path>` (resolve via signedUrl())
 *   - demo            → `data:<mime>;base64,...`
 */

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Buckets whose objects are world-readable by their public URL. */
const PUBLIC_BUCKETS: BucketName[] = [BUCKETS.attachments, BUCKETS.documents];

export interface StoredFile {
  url: string; // value to persist in the `url` column
  path: string; // object path within the bucket ("" in demo mode)
  bucket: BucketName | "demo";
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

/** Reasonably unique object key without depending on Math.random/Date in edge. */
function objectKey(orgId: string, scope: string, fileName: string) {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${orgId}/${scope}/${stamp}-${rand}-${sanitize(fileName)}`;
}

export async function storeFile(opts: {
  orgId: string;
  scope: string; // e.g. work order id, "receipts", "pdf"
  bucket: BucketName;
  file: File;
}): Promise<StoredFile> {
  const { orgId, scope, bucket, file } = opts;

  if (!isSupabaseEnabled()) {
    const buf = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type || "application/octet-stream"};base64,${buf.toString("base64")}`;
    return { url: dataUrl, path: "", bucket: "demo" };
  }

  const supabase = await createSupabaseServerClient();
  const path = objectKey(orgId, scope, file.name);
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(`Uppladdning misslyckades: ${error.message}`);

  if (PUBLIC_BUCKETS.includes(bucket)) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl, path, bucket };
  }
  // Private bucket — store a resolvable reference, sign on read.
  return { url: `storage:${bucket}/${path}`, path, bucket };
}

/**
 * Resolve a stored reference to a displayable URL. Public URLs and data URLs
 * pass through unchanged; `storage:<bucket>/<path>` refs get a fresh signed URL.
 */
export async function resolveFileUrl(
  ref: string,
  expiresInSeconds = 60 * 60
): Promise<string> {
  if (!ref.startsWith("storage:")) return ref;
  const rest = ref.slice("storage:".length);
  const slash = rest.indexOf("/");
  const bucket = rest.slice(0, slash);
  const path = rest.slice(slash + 1);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return "";
  return data.signedUrl;
}
