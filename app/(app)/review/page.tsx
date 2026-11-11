import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
import { requireRole } from "@/app/lib/auth";
import { REVIEW_APPLICATIONS } from "@/app/lib/roles";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await requireRole(REVIEW_APPLICATIONS);

  const [postings] = await pool.query<RowDataPacket[]>(
    `SELECT jp.public_id, jp.job_title, jp.location, jp.date_posted, jp.date_closed,
            c.name AS company_name,
            (SELECT COUNT(*) FROM submitted_applications sa
             WHERE sa.job_description_id = jp.id) AS applicant_count
     FROM job_postings jp
     JOIN company c ON c.id = jp.company_id
     WHERE jp.company_id IN (
       SELECT company_id FROM company_members WHERE user_id = ?
       UNION
       SELECT company_id FROM company_admins WHERE user_id = ?
     )
     ORDER BY jp.date_posted DESC`,
    [user.id, user.id]
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Review Applications</h1>
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Job title</th>
              <th className="p-3">Company</th>
              <th className="p-3">Location</th>
              <th className="p-3">Posted</th>
              <th className="p-3">Applicants</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {postings.map((p) => (
              <tr key={p.public_id} className="border-b last:border-0">
                <td className="p-3 font-medium">{p.job_title}</td>
                <td className="p-3">{p.company_name}</td>
                <td className="p-3">{p.location}</td>
                <td className="p-3">{new Date(p.date_posted).toLocaleDateString()}</td>
                <td className="p-3">{p.applicant_count}</td>
                <td className="p-3">
                  <Link
                    href={`/job-postings/${p.public_id}/applications`}
                    className="text-blue-600 hover:underline"
                  >
                    View applications
                  </Link>
                </td>
              </tr>
            ))}
            {postings.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  No job postings for your company yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}