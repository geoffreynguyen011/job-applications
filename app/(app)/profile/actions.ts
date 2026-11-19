"use server";

import { revalidatePath } from "next/cache";
import { pool } from "@/app/lib/db";
import { requireRole } from "@/app/lib/auth";
import { SUMMARY_ROLES, PROFILE_PICTURE_ROLES } from "@/app/lib/roles";

export type ProfileState = { error?: string; success?: string };

const get = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_IMAGE = 1024 * 1024; // 1 MB

// Identify the image from its first bytes, never from the filename or browser-sent type
function sniffImage(b: Buffer): string | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export async function updateSummary(_p: ProfileState, fd: FormData): Promise<ProfileState> {
  const user = await requireRole(SUMMARY_ROLES);
  const summary = get(fd, "summary").slice(0, 2000) || null;

  // Applicants keep their summary on the applicants table; staff use users
  if (user.role === "applicant") {
    await pool.query("UPDATE applicants SET summary = ? WHERE user_id = ?", [summary, user.id]);
  } else {
    await pool.query("UPDATE users SET summary = ? WHERE id = ?", [summary, user.id]);
  }
  revalidatePath("/profile");
  return { success: "Summary saved." };
}

export async function uploadPicture(_p: ProfileState, fd: FormData): Promise<ProfileState> {
  const user = await requireRole(PROFILE_PICTURE_ROLES);

  const file = fd.get("picture");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  if (file.size > MAX_IMAGE) return { error: "Image must be 1 MB or smaller." };

  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniffImage(buf);
  if (!type) return { error: "Use a JPEG, PNG, or WebP image." };

  await pool.query(
    `INSERT INTO profile_pictures (user_id, content_type, data) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE content_type = VALUES(content_type), data = VALUES(data)`,
    [user.id, type, buf]
  );
  revalidatePath("/profile");
  return { success: "Picture updated." };
}

export async function removePicture() {
  const user = await requireRole(PROFILE_PICTURE_ROLES);
  await pool.query("DELETE FROM profile_pictures WHERE user_id = ?", [user.id]);
  revalidatePath("/profile");
}

export async function addExperience(_p: ProfileState, fd: FormData): Promise<ProfileState> {
  const user = await requireRole(["applicant"]);
  const title = get(fd, "job_title").slice(0, 150);
  const company = get(fd, "company_name").slice(0, 150);
  const start = get(fd, "start_date");
  const end = get(fd, "end_date");
  const description = get(fd, "description").slice(0, 2000);

  if (!title || !company) return { error: "Job title and company are required." };
  if (!DATE.test(start)) return { error: "Choose a start date." };
  if (end && (!DATE.test(end) || end < start)) {
    return { error: "End date must be on or after the start date." };
  }

  await pool.query(
    `INSERT INTO work_experience (user_id, job_title, company_name, start_date, end_date, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.id, title, company, start, end || null, description || null]
  );
  revalidatePath("/profile");
  return { success: "Experience added." };
}

export async function deleteExperience(fd: FormData) {
  const user = await requireRole(["applicant"]);
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) return;
  // user_id = session user: nobody can delete someone else's entry
  await pool.query("DELETE FROM work_experience WHERE id = ? AND user_id = ?", [id, user.id]);
  revalidatePath("/profile");
}

export async function addEducation(_p: ProfileState, fd: FormData): Promise<ProfileState> {
  const user = await requireRole(["applicant"]);
  const institution = get(fd, "institution").slice(0, 150);
  const degree = get(fd, "degree").slice(0, 100) || null;
  const field = get(fd, "field_of_study").slice(0, 100) || null;

  const year = (k: string) => {
    const v = get(fd, k);
    if (!v) return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 1950 && n <= 2100 ? n : NaN;
  };
  const startYear = year("start_year");
  const endYear = year("end_year");

  if (!institution) return { error: "Institution is required." };
  if (Number.isNaN(startYear) || Number.isNaN(endYear)) {
    return { error: "Years must be between 1950 and 2100." };
  }
  if (startYear && endYear && endYear < startYear) {
    return { error: "End year must be on or after the start year." };
  }

  await pool.query(
    `INSERT INTO education (user_id, institution, degree, field_of_study, start_year, end_year)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.id, institution, degree, field, startYear, endYear]
  );
  revalidatePath("/profile");
  return { success: "Education added." };
}

export async function deleteEducation(fd: FormData) {
  const user = await requireRole(["applicant"]);
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) return;
  await pool.query("DELETE FROM education WHERE id = ? AND user_id = ?", [id, user.id]);
  revalidatePath("/profile");
}