import { pool } from "@/app/lib/db";
import type { RowDataPacket } from "mysql2";

export async function fetchApplications() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      u.first_name,
      u.last_name,
      u.email,
      a.company_name,
      a.location,
      a.currency,
      a.minimum_pay,
      a.maximum_pay,
      ja.application_status,
      ja.date_applied
    FROM jobs_applied ja
    JOIN users u ON u.id = ja.user_id
    JOIN applications a ON a.id = ja.job_description_id
    ORDER BY ja.date_applied DESC
  `);

  return rows;

  } catch (error) {
    throw new Error('Failed to fetch data for applications.');
  }
}

