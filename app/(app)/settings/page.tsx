import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
import { requireRole } from "@/app/lib/auth";
import { VIEW_SETTINGS } from "@/app/lib/roles";
import { AccountForm, PasswordForm } from "./settings-forms";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireRole(VIEW_SETTINGS);

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT first_name, last_name, email FROM users WHERE id = ?",
    [user.id]
  );
  const account = rows[0];

  let profile = null;
  if (user.role === "applicant") {
    const [p] = await pool.query<RowDataPacket[]>(
      "SELECT degree, field_of_study, university, location, summary FROM applicants WHERE user_id = ?",
      [user.id]
    );
    profile = {
      degree: p[0]?.degree ?? "",
      field_of_study: p[0]?.field_of_study ?? "",
      university: p[0]?.university ?? "",
      location: p[0]?.location ?? "",
      summary: p[0]?.summary ?? "",
    };
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <AccountForm first={account.first_name} last={account.last_name} email={account.email} />
      <PasswordForm />
    </div>
  );
}