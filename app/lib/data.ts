import "server-only";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
import type { Role } from "@/app/lib/auth";

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
export async function fetchApplications(user: {
  id: number;
  role: Role;
}): Promise<ApplicationRow[]> {
  let where: string;
  let params: number[] = [];

  if (user.role === "applicant") {
    where = "WHERE sa.applicant_id = ?"; // only their own
    params = [user.id];
  } else if (user.role === "admin") {
    where = ""; // everything
  } else if (user.role === "company_admin") {
    where = `WHERE jp.company_id IN
               (SELECT company_id FROM company_admins WHERE user_id = ?)`;
    params = [user.id];
  } else {
    return []; // recruiters and hiring managers: no company link yet
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       jp.public_id,
       jp.job_title,
       c.name AS company_name,
       jp.location,
       jp.currency,
       jp.minimum_pay,
       jp.maximum_pay,
       sa.application_status,
       sa.date_applied,
       CONCAT(u.first_name, ' ', u.last_name) AS applicant_name
     FROM submitted_applications sa
     JOIN job_postings jp ON jp.id = sa.job_description_id
     JOIN company c ON c.id = jp.company_id
     JOIN users u ON u.id = sa.applicant_id
     ${where}
     ORDER BY sa.date_applied DESC`,
    params
  );

  return rows as ApplicationRow[];
}
