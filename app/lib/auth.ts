import "server-only";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
import { getSession } from "@/app/lib/session";
import { redirect, forbidden } from "next/navigation";

// Can this user create companies? (company administrators only)
export async function getCompanyAdminUserId(): Promise<number | null> {
  const session = await getSession();
  if (!session) return null;

  // Check the database each time so role changes take effect immediately
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT user_sub_group FROM users WHERE id = ?",
    [session.userId]
  );
  return rows[0]?.user_sub_group === "company_admin" ? session.userId : null;
}

// Is this user an administrator of this specific company?
export async function isCompanyAdmin(companyId: number): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT 1 FROM company_admins WHERE user_id = ? AND company_id = ?",
    [session.userId, companyId]
  );
  return rows.length > 0;
}

export type Role =
  | "admin"
  | "company_admin"
  | "recruiter"
  | "hiring_manager"
  | "applicant";

export async function getCurrentUser(): Promise<{
  id: number;
  firstName: string;
  role: Role;
} | null> {
  const session = await getSession();
  if (!session) return null;

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, first_name, user_sub_group FROM users WHERE id = ?",
    [session.userId]
  );
  const u = rows[0];
  if (!u) return null; // account was deleted

  return { id: u.id, firstName: u.first_name, role: u.user_sub_group as Role };
}

export async function requireRole(allowed: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!allowed.includes(user.role)) forbidden(); // same 403 setup as before
  return user;
}