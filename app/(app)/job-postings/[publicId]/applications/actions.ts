"use server";

import type { RowDataPacket } from "mysql2";
import { revalidatePath } from "next/cache";
import { pool } from "@/app/lib/db";
import { requireRole, canManageCompany } from "@/app/lib/auth";
import { REVIEW_APPLICATIONS } from "@/app/lib/roles";

export type InterviewState = { error?: string; success?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORMATS = ["video", "phone", "onsite"];
const DURATIONS = [15, 30, 45, 60, 90];

export async function scheduleInterview(
  _prev: InterviewState,
  fd: FormData
): Promise<InterviewState> {
  const user = await requireRole(REVIEW_APPLICATIONS);

  const publicId = String(fd.get("public_id") ?? "");
  const applicantId = Number(fd.get("applicant_id"));
  const when = String(fd.get("scheduled_at") ?? ""); // "2026-11-20T14:30"
  const duration = Number(fd.get("duration_minutes"));
  const format = String(fd.get("format") ?? "");
  const location = String(fd.get("location") ?? "").trim().slice(0, 255);
  const notes = String(fd.get("notes") ?? "").trim().slice(0, 2000);

  if (!UUID.test(publicId) || !Number.isInteger(applicantId)) {
    return { error: "Invalid request." };
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when)) {
    return { error: "Choose a date and time." };
  }
  if (new Date(when) <= new Date()) {
    return { error: "The interview must be in the future." };
  }
  if (!DURATIONS.includes(duration) || !FORMATS.includes(format)) {
    return { error: "Invalid duration or format." };
  }
  if (format !== "phone" && !location) {
    return { error: "Add a meeting link or address." };
  }

  // The job and its company come from the database, never the form
  const [jobs] = await pool.query<RowDataPacket[]>(
    "SELECT id, company_id FROM job_postings WHERE public_id = ?",
    [publicId]
  );
  const job = jobs[0];
  if (!job || !(await canManageCompany(user.id, job.company_id))) {
    return { error: "You can't schedule interviews for this job." };
  }

  // Applicant must have applied to this job
  const [applied] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM submitted_applications
     WHERE applicant_id = ? AND job_description_id = ?`,
    [applicantId, job.id]
  );
  if (applied.length === 0) return { error: "That person hasn't applied to this job." };

  // Don't double-book the same applicant at the same time
  const [clash] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM interviews
     WHERE applicant_id = ? AND status = 'scheduled' AND scheduled_at = ?`,
    [applicantId, when.replace("T", " ") + ":00"]
  );
  if (clash.length > 0) return { error: "This applicant already has an interview at that time." };

  await pool.query(
    `INSERT INTO interviews
       (applicant_id, job_posting_id, scheduled_by, scheduled_at,
        duration_minutes, format, location, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [applicantId, job.id, user.id, when.replace("T", " ") + ":00",
     duration, format, location || null, notes || null]
  );

  revalidatePath(`/job-postings/${publicId}/applications`);
  return { success: "Interview scheduled." };
}

export async function cancelInterview(fd: FormData) {
  const user = await requireRole(REVIEW_APPLICATIONS);
  const id = Number(fd.get("interview_id"));
  if (!Number.isInteger(id)) return;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT jp.company_id, jp.public_id
     FROM interviews i JOIN job_postings jp ON jp.id = i.job_posting_id
     WHERE i.id = ?`,
    [id]
  );
  const row = rows[0];
  if (!row || !(await canManageCompany(user.id, row.company_id))) return;

  await pool.query("UPDATE interviews SET status = 'cancelled' WHERE id = ?", [id]);
  revalidatePath(`/job-postings/${row.public_id}/applications`);
}