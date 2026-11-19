import "server-only";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";

export const PAGE_SIZE = 10;

export type ApplicationRow = {
  public_id: string;
  job_title: string;
  company_name: string;
  location: string;
  currency: string;
  minimum_pay: string;
  maximum_pay: string;
  application_status: "in_consideration" | "accepted" | "declined";
  date_applied: Date | string;
  applicant_name: string;
};

// Who sees what is decided here, on the server, based on the user's role
export async function fetchApplications(
  user: { id: number },
  page: number
): Promise<{ rows: ApplicationRow[]; total: number }> {
  const [countRows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM submitted_applications WHERE applicant_id = ?",
    [user.id]
  );
  const total = Number(countRows[0].total);

  // page is a validated integer (see the page), so it's safe to put in the SQL text
  const offset = (Math.max(1, Math.floor(page)) - 1) * PAGE_SIZE;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT jp.public_id, jp.job_title, c.name AS company_name, jp.location,
            jp.currency, jp.minimum_pay, jp.maximum_pay,
            sa.application_status, sa.date_applied,
            CONCAT(u.first_name, ' ', u.last_name) AS applicant_name
     FROM submitted_applications sa
     JOIN job_postings jp ON jp.id = sa.job_description_id
     JOIN company c ON c.id = jp.company_id
     JOIN users u ON u.id = sa.applicant_id
     WHERE sa.applicant_id = ?
     ORDER BY sa.date_applied DESC, jp.id DESC
     LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
    [user.id]
  );

  return { rows: rows as ApplicationRow[], total };
}