import { env } from "cloudflare:workers";
import { getDb, ensureSchema } from "../../../db";
import { employmentApplications } from "../../../db/schema";
import { cleanEmail, cleanPhone, cleanText, requestExceedsBytes, verifyPublicForm } from "../../../lib/public-form";
import { sendStaffNotification } from "../../../lib/transactional-email";
import { allowedResumeExtensions, isAllowedResumeFile } from "../../../lib/resume-file";

const allowedTypes = new Set(["Full time", "Part time", "Either"]);
const allowedShifts = new Set(["Morning", "Afternoon", "Evening", "Flexible"]);
const allowedDays = new Set(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
/* A text resume is well under 1 MB and a scanned one rarely passes 3 MB.
   The cap bounds what a single submission can push into R2. */
const maxResumeBytes = 3 * 1024 * 1024;

function field(form: FormData, key: string, max: number) {
  return cleanText(form.get(key), max);
}

export async function POST(request: Request) {
  let uploadedKey: string | null = null;
  try {
    if (requestExceedsBytes(request, 4 * 1024 * 1024)) {
      return Response.json({ error: "Application files and fields must total no more than 6 MB." }, { status: 413 });
    }
    const form = await request.formData();
    const fullName = field(form, "fullName", 100);
    const email = cleanEmail(form.get("email"));
    const phone = cleanPhone(form.get("phone"));
    /* The shop cross-trains: every hire works the kitchen, the register and the
       bar, so applicants no longer pick a role. The column stays populated so
       existing rows and the staff view keep the same shape. */
    const position = "All roles";
    const employmentType = field(form, "employmentType", 30);
    const shiftValue = field(form, "shift", 30);
    const shift = allowedShifts.has(shiftValue) ? shiftValue : null;
    const startDate = field(form, "startDate", 10) || null;
    const isAdultValue = field(form, "isAdult", 3);
    const experience = field(form, "experience", 4000) || null;
    const why = field(form, "why", 4000) || null;
    const days = form.getAll("days").map((day) => cleanText(day, 3)).filter((day) => allowedDays.has(day));

    if (fullName.length < 2 || !email || phone.length < 7 || !allowedTypes.has(employmentType) || !["Yes", "No"].includes(isAdultValue)) {
      return Response.json({ error: "Complete all required application fields." }, { status: 400 });
    }
    if (!(await verifyPublicForm(request, form.get("turnstileToken"), "employment"))) {
      return Response.json({ error: "Please complete the security check and try again." }, { status: 400 });
    }

    const resume = form.get("resume");
    let resumeName: string | null = null;
    let resumeType: string | null = null;
    let resumeSize: number | null = null;
    if (resume instanceof File && resume.size > 0) {
      const extension = resume.name.split(".").pop()?.toLowerCase() ?? "";
      if (!allowedResumeExtensions.has(extension) || resume.size > maxResumeBytes || !(await isAllowedResumeFile(resume, extension))) {
        return Response.json({ error: "Resume must be a PDF, Word, RTF, or text file no larger than 3 MB." }, { status: 400 });
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

    const reference = `JOB-${application.id}`;
    const notificationDelivered = await sendStaffNotification("employment", `New job application ${reference}`, [
      `Applicant: ${fullName} <${email}>`,
      `Phone: ${phone}`,
      `Employment type: ${employmentType}`,
      `Resume: ${resumeName ? "Attached securely in the staff dashboard" : "Not provided"}`,
      "Open the staff dashboard to review the application.",
    ], email);
    if (!notificationDelivered) {
      console.warn(JSON.stringify({ service: "deaf-shark-coffee", event: "staff_notification_pending", channel: "employment", reference }));
    }
    return Response.json({ success: true, reference }, { status: 201 });
  } catch (error) {
    if (uploadedKey) {
      const uploads = (env as unknown as { UPLOADS?: R2Bucket }).UPLOADS;
      await uploads?.delete(uploadedKey).catch(() => undefined);
    }
    console.error(JSON.stringify({ service: "deaf-shark-coffee", event: "employment_submission_failed", errorType: error instanceof Error ? error.name : "UnknownError" }));
    return Response.json({ error: "We could not save your application. Please try again or call the shop." }, { status: 500 });
  }
}
