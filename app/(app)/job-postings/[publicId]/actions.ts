"use server";

import type { RowDataPacket } from "mysql2";
import { redirect } from "next/navigation";
import { pool } from "@/app/lib/db";
import { requireRole } from "@/app/lib/auth";

export type ApplyState = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function applyToJob(
  _prev: ApplyState,
  formData: FormData
): Promise<ApplyState> {
  // Only applicants; the applicant id comes from the session, never the form
  const user = await requireRole(["applicant"]);

  const publicId = String(formData.get("public_id") ?? "");
  if (!UUID.test(publicId)) return { error: "Invalid job posting." };

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, date_closed FROM job_postings WHERE public_id = ?",
    [publicId]
  );
  const posting = rows[0];
  if (!posting) return { error: "That job posting no longer exists." };

  // Re-check that it's still open (the page check alone isn't enough)
  if (posting.date_closed && new Date(posting.date_closed) < new Date()) {
    return { error: "This job posting has closed." };
  }

  try {
    await pool.query(
      `INSERT INTO submitted_applications
         (applicant_id, job_description_id, application_status, date_applied)
       VALUES (?, ?, 'in_consideration', CURDATE())`,
      [user.id, posting.id]
    );
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return { error: "You've already applied to this job." };
    }
    console.error(err);
    return { error: "Something went wrong submitting your application." };
  }

  redirect("/applications");
}