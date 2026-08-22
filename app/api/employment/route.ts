import { env } from "cloudflare:workers";
import { getDb, ensureSchema } from "../../../db";
import { employmentApplications } from "../../../db/schema";
import { cleanEmail, cleanPhone, cleanText, verifyPublicForm } from "../../../lib/public-form";

const allowedPositions = new Set(["Barista", "Kitchen", "Cashier", "Shift Lead", "Open to anything"]);
const allowedTypes = new Set(["Full time", "Part time", "Either"]);
const allowedShifts = new Set(["Morning", "Afternoon", "Evening", "Flexible"]);
const allowedDays = new Set(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
const allowedExtensions = new Set(["pdf", "doc", "docx", "txt", "rtf"]);
const maxResumeBytes = 5 * 1024 * 1024;

function field(form: FormData, key: string, max: number) {
  return cleanText(form.get(key), max);
}

export async function POST(request: Request) {
  let uploadedKey: string | null = null;
  try {
    const form = await request.formData();
    const fullName = field(form, "fullName", 100);
    const email = cleanEmail(form.get("email"));
    const phone = cleanPhone(form.get("phone"));
    const position = field(form, "position", 50);
    const employmentType = field(form, "employmentType", 30);
    const shiftValue = field(form, "shift", 30);
    const shift = allowedShifts.has(shiftValue) ? shiftValue : null;
    const startDate = field(form, "startDate", 10) || null;
    const isAdultValue = field(form, "isAdult", 3);
    const experience = field(form, "experience", 4000) || null;
    const why = field(form, "why", 4000) || null;
    const days = form.getAll("days").map((day) => cleanText(day, 3)).filter((day) => allowedDays.has(day));

    if (fullName.length < 2 || !email || phone.length < 7 || !allowedPositions.has(position) || !allowedTypes.has(employmentType) || !["Yes", "No"].includes(isAdultValue)) {
      return Response.json({ error: "Complete all required application fields." }, { status: 400 });
    }
    if (!(await verifyPublicForm(request, form.get("turnstileToken")))) {
      return Response.json({ error: "Please complete the security check and try again." }, { status: 400 });
    }

    const resume = form.get("resume");
    let resumeName: string | null = null;
    let resumeType: string | null = null;
    let resumeSize: number | null = null;
    if (resume instanceof File && resume.size > 0) {
      const extension = resume.name.split(".").pop()?.toLowerCase() ?? "";
      if (!allowedExtensions.has(extension) || resume.size > maxResumeBytes) {
        return Response.json({ error: "Resume must be a PDF, Word, RTF, or text file no larger than 5 MB." }, { status: 400 });
      }
      const uploads = (env as unknown as { UPLOADS?: R2Bucket }).UPLOADS;
      if (!uploads) return Response.json({ error: "Resume storage is not configured yet. Please try again without a resume or call the shop." }, { status: 503 });
      const safeName = resume.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
      uploadedKey = `employment/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
      await uploads.put(uploadedKey, resume.stream(), { httpMetadata: { contentType: resume.type || "application/octet-stream" } });
      resumeName = safeName;
      resumeType = resume.type || "application/octet-stream";
      resumeSize = resume.size;
    }

    await ensureSchema();
    const [application] = await getDb().insert(employmentApplications).values({
      fullName,
      email,
      phone,
      position,
      employmentType,
      daysJson: JSON.stringify(days),
      shift,
      startDate,
      isAdult: isAdultValue === "Yes",
      experience,
      why,
      resumeKey: uploadedKey,
      resumeName,
      resumeType,
      resumeSize,
    }).returning({ id: employmentApplications.id });

    return Response.json({ success: true, reference: `JOB-${application.id}` }, { status: 201 });
  } catch {
    if (uploadedKey) {
      const uploads = (env as unknown as { UPLOADS?: R2Bucket }).UPLOADS;
      await uploads?.delete(uploadedKey).catch(() => undefined);
    }
    return Response.json({ error: "We could not save your application. Please try again or call the shop." }, { status: 500 });
  }
}
