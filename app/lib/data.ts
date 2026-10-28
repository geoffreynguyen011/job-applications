import "server-only";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";

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
export async function fetchApplications(user: { id: number }) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT jp.public_id, jp.job_title, c.name AS company_name, jp.location,
            jp.currency, jp.minimum_pay, jp.maximum_pay,
            sa.application_status, sa.date_applied
     FROM submitted_applications sa
     JOIN job_postings jp ON jp.id = sa.job_description_id
     JOIN company c ON c.id = jp.company_id
     WHERE sa.applicant_id = ?
     ORDER BY sa.date_applied DESC`,
    [user.id]
  );
  return rows as ApplicationRow[];
}
