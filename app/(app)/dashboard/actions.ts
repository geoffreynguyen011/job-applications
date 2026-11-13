"use server";

import { revalidatePath } from "next/cache";
import { pool } from "@/app/lib/db";
import { requireRole } from "@/app/lib/auth";

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