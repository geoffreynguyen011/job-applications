"use server";

import { revalidatePath } from "next/cache";
import { pool } from "@/app/lib/db";
import { requireRole } from "@/app/lib/auth";
import { RowDataPacket } from "mysql2";

export async function respondToInterview(fd: FormData) {
  const user = await requireRole(["applicant"]);
  const id = Number(fd.get("interview_id"));
  const response = String(fd.get("response") ?? "");
  if (!Number.isInteger(id) || !["accepted", "declined"].includes(response)) return;

  // applicant_id = session user: people can only answer their own interviews
  await pool.query(
    `UPDATE interviews SET applicant_response = ?
     WHERE id = ? AND applicant_id = ? AND status = 'scheduled' AND scheduled_at >= NOW()`,
    [response, id, user.id]
  );
  revalidatePath("/dashboard");
}

export async function dismissNotice(fd: FormData) {
  const user = await requireRole(["applicant"]);
  const publicId = String(fd.get("public_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(publicId)) return;

  // Work out the current notice on the server; never trust the form for it
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT sa.application_status, jp.id AS job_id,
            (jp.date_closed IS NULL OR jp.date_closed >= CURDATE()) AS is_open
     FROM submitted_applications sa
     JOIN job_postings jp ON jp.id = sa.job_description_id
     WHERE jp.public_id = ? AND sa.applicant_id = ?`,
    [publicId, user.id]
  );
  const r = rows[0];
  if (!r) return;

  let notice: "declined" | "closed" | null = null;
  if (r.application_status === "declined") notice = "declined";
  else if (r.application_status === "in_consideration" && Number(r.is_open) === 0) notice = "closed";
  if (!notice) return; // accepted or still open: nothing to dismiss

  await pool.query(
    `UPDATE submitted_applications SET dismissed_notice = ?
     WHERE applicant_id = ? AND job_description_id = ?`,
    [notice, user.id, r.job_id]
  );
  revalidatePath("/dashboard");
}