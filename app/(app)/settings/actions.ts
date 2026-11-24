"use server";

import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { revalidatePath } from "next/cache";
import { pool } from "@/app/lib/db";
import { requireRole } from "@/app/lib/auth";
import { ALL_ROLES } from "@/app/lib/roles";

export type SettingsState = { error?: string; success?: string };

const get = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function updateAccount(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const user = await requireRole(ALL_ROLES);
  const first = get(fd, "first_name").slice(0, 100);
  const last = get(fd, "last_name").slice(0, 100);
  const email = get(fd, "email").toLowerCase().slice(0, 150);
  const current = String(fd.get("current_password") ?? "");

  if (!first || !last || !/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Enter a first name, last name, and valid email." };
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT email, password FROM users WHERE id = ?",
    [user.id]
  );
  if (!rows[0]) return { error: "Account not found." };

  // Any change to the sign-in email requires the current password
  const emailChanged = email !== String(rows[0].email).toLowerCase();
  if (emailChanged) {
    const ok = current !== "" && (await bcrypt.compare(current, rows[0].password));
    if (!ok) {
      return { error: "Enter your current password to change your email." };
    }
  }

  try {
    await pool.query(
      "UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?",
      [first, last, email, user.id]
    );
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") return { error: "That email is already in use." };
    console.error(err);
    return { error: "Couldn't save your changes." };
  }
  revalidatePath("/", "layout");
  return { success: "Account updated." };
}

export async function changePassword(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const user = await requireRole(ALL_ROLES);
  const current = String(fd.get("current_password") ?? "");
  const next = String(fd.get("new_password") ?? "");
  const confirm = String(fd.get("confirm_password") ?? "");

  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords don't match." };

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT password FROM users WHERE id = ?",
    [user.id]
  );
  if (!rows[0] || !(await bcrypt.compare(current, rows[0].password))) {
    return { error: "Current password is incorrect." };
  }

  await pool.query("UPDATE users SET password = ? WHERE id = ?", [
    await bcrypt.hash(next, 10),
    user.id,
  ]);
  return { success: "Password changed." };
}

export async function updateApplicantProfile(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const user = await requireRole(["applicant"]);
  const f = (k: string, max: number) => get(fd, k).slice(0, max) || null;

  await pool.query(
    `UPDATE applicants
     SET degree = ?, field_of_study = ?, university = ?, location = ?, summary = ?
     WHERE user_id = ?`,
    [f("degree", 100), f("field_of_study", 100), f("university", 150),
     f("location", 150), f("summary", 2000), user.id]
  );
  return { success: "Profile updated." };
}