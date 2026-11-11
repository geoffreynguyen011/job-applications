import Link from "next/link";
import { notFound } from "next/navigation";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
import { requireRole } from "@/app/lib/auth";
import { VIEW_COMPANIES } from "@/app/lib/roles";

export const dynamic = "force-dynamic";

const formatDate = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString() : "—";

export default async function CompanySummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(VIEW_COMPANIES);

  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const companyId = Number(id);

  const [companyRows] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, employee_count, description FROM company WHERE id = ?",
    [companyId]
  );
  const company = companyRows[0];
  if (!company) notFound();

  const [admins] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.first_name, u.last_name, u.email
     FROM company_admins ca JOIN users u ON u.id = ca.user_id
     WHERE ca.company_id = ?`,
    [companyId]
  );

  const [members] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.user_sub_group
     FROM company_members cm JOIN users u ON u.id = cm.user_id
     WHERE cm.company_id = ?`,
    [companyId]
  );

  const [postings] = await pool.query<RowDataPacket[]>(
    `SELECT jp.public_id, jp.job_title, jp.location, jp.date_posted, jp.date_closed,
            (jp.date_closed IS NULL OR jp.date_closed >= CURDATE()) AS is_open,
            (SELECT COUNT(*) FROM submitted_applications sa
             WHERE sa.job_description_id = jp.id) AS applicant_count
     FROM job_postings jp
     WHERE jp.company_id = ?
     ORDER BY jp.date_posted DESC`,
    [companyId]
  );

  const openCount = postings.filter((p) => Number(p.is_open) === 1).length;
  const totalApplicants = postings.reduce((n, p) => n + Number(p.applicant_count), 0);

  const stats = [
    { label: "Job postings", value: postings.length },
    { label: "Open postings", value: openCount },
    { label: "Total applications", value: totalApplicants },
  ];

  const people = (title: string, rows: RowDataPacket[], empty: string) => (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map((u) => (
            <li key={u.id}>
              <span className="font-medium">{u.first_name} {u.last_name}</span>
              {u.user_sub_group && (
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {u.user_sub_group}
                </span>
              )}
              <div className="text-gray-500">{u.email}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/companies" className="text-sm text-gray-600 hover:underline">
        ← Back to companies
      </Link>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{company.name}</h1>
        {company.employee_count && (
          <p className="mt-1 text-sm text-gray-500">{company.employee_count} employees</p>
        )}
        <p className="mt-3 whitespace-pre-line text-sm text-gray-700">
          {company.description || "No company description provided."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {people("Administrators", admins, "No administrators.")}
        {people("Recruiters and hiring managers", members, "No staff linked yet.")}
      </div>

      <section className="rounded-lg border bg-white shadow-sm">
        <h2 className="p-6 pb-3 text-lg font-semibold">Job postings</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y bg-gray-50 text-gray-500">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Location</th>
                <th className="p-3">Posted</th>
                <th className="p-3">Closes</th>
                <th className="p-3">Status</th>
                <th className="p-3">Applicants</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {postings.map((p) => {
                const open = Number(p.is_open) === 1;
                return (
                  <tr key={p.public_id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{p.job_title}</td>
                    <td className="p-3">{p.location}</td>
                    <td className="p-3">{formatDate(p.date_posted)}</td>
                    <td className="p-3">{formatDate(p.date_closed)}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        open ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}>
                        {open ? "Open" : "Closed"}
                      </span>
                    </td>
                    <td className="p-3">{p.applicant_count}</td>
                    <td className="p-3">
                      <Link
                        href={`/job-postings/${p.public_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {postings.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    This company has no job postings.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}