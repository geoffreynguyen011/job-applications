import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
import { requireRole } from "@/app/lib/auth";
import { VIEW_COMPANIES } from "@/app/lib/roles";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  await requireRole(VIEW_COMPANIES);

  const [companies] = await pool.query<RowDataPacket[]>(
    `SELECT c.id, c.name, c.employee_count,
            (SELECT COUNT(*) FROM job_postings jp
             WHERE jp.company_id = c.id) AS posting_count,
            (SELECT COUNT(*) FROM submitted_applications sa
             JOIN job_postings jp ON jp.id = sa.job_description_id
             WHERE jp.company_id = c.id) AS application_count
     FROM company c
     ORDER BY c.name`
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Companies</h1>
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Company</th>
              <th className="p-3">Employees</th>
              <th className="p-3">Job postings</th>
              <th className="p-3">Applications</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.employee_count || "—"}</td>
                <td className="p-3">{c.posting_count}</td>
                <td className="p-3">{c.application_count}</td>
                <td className="p-3">
                  <Link
                    href={`/companies/${c.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View summary
                  </Link>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  No companies yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}