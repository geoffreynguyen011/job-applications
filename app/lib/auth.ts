import "server-only";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
import { getSession } from "@/app/lib/session";

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