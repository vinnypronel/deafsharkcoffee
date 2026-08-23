import { env } from "cloudflare:workers";
import { requireStaff } from "../../../../lib/staff-auth";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"]);

export async function POST(request: Request) {
  const staff = await requireStaff(request);
  if (staff.response) return staff.response;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Choose an image or video." }, { status: 400 });
  if (!allowed.has(file.type) || file.size > 25 * 1024 * 1024) {
    return Response.json({ error: "Use a JPG, PNG, WebP, GIF, MP4, or WebM file no larger than 25 MB." }, { status: 400 });
  }
  const uploads = (env as unknown as { UPLOADS?: R2Bucket }).UPLOADS;
  if (!uploads) return Response.json({ error: "Media storage is not configured." }, { status: 503 });
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
  const key = `site-media/${crypto.randomUUID()}.${extension}`;
  await uploads.put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" } });
  return Response.json({ success: true, url: `/api/media?key=${encodeURIComponent(key)}` }, { status: 201 });
}
