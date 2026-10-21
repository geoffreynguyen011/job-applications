"use server";

import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { redirect } from "next/navigation";
import { pool } from "@/app/lib/db";
import { createSession, deleteSession } from "@/app/lib/session";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, password FROM users WHERE email = ?",
    [email]
  );
  const user = rows[0];

  const valid = user && (await bcrypt.compare(password, user.password));
  if (!valid) {
    // Same message for "no such user" and "wrong password"
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}