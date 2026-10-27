import Link from "next/link";
import { pool } from "@/app/lib/db";
import type { RowDataPacket } from "mysql2";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

function formatPay(currency: string, min: string, max: string) {
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  return `${fmt.format(Number(min))} – ${fmt.format(Number(max))}`;
}

function formatDate(d: Date | string | null) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default async function JobPostingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [postings] = await pool.query<RowDataPacket[]>(
    `SELECT
       jp.id,
       jp.public_id,
       c.name AS company_name,
       jp.job_title,
       jp.availability,
       jp.job_length,
       jp.location,
       jp.currency,
       jp.minimum_pay,
       jp.maximum_pay,
       jp.date_posted,
       jp.date_closed,
       sa.application_status AS my_status,
       sa.date_applied AS my_date_applied
     FROM job_postings jp
     JOIN company c ON c.id = jp.company_id
     LEFT JOIN submitted_applications sa
       ON sa.job_description_id = jp.id AND sa.applicant_id = ?
     ORDER BY jp.date_posted DESC`,
    [user.id]
  );

  const today = new Date();
  const isOpen = (closed: Date | string | null) =>
    !closed || new Date(closed) >= today;

  const openCount = postings.filter((p) => isOpen(p.date_closed)).length;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Job Postings</h1>

      {/* <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div> */}

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Company</th>
              <th className="p-3">Job title</th>
              <th className="p-3">Type</th>
              <th className="p-3">Length</th>
              <th className="p-3">Location</th>
              <th className="p-3">Pay range</th>
              <th className="p-3">Posted</th>
              <th className="p-3">Closes</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {postings.map((p) => (
              <tr key={p.id} className="border-b align-top last:border-0">
                <td className="p-3 font-medium">{p.company_name}</td>
                <td className="p-3">
                  <div className="font-medium">{p.job_title}</div>
                </td>
                <td className="p-3">{p.availability}</td>
                <td className="p-3">{p.job_length}</td>
                <td className="p-3">{p.location}</td>
                <td className="p-3 whitespace-nowrap">
                  {formatPay(p.currency, p.minimum_pay, p.maximum_pay)}
                </td>
                <td className="p-3">{formatDate(p.date_posted)}</td>
                <td className="p-3">{formatDate(p.date_closed)}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      isOpen(p.date_closed)
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {isOpen(p.date_closed) ? "Open" : "Closed"}
                  </span>
                </td>
                <td className="p-3">
                  {p.my_status ? (
                    <div className="flex flex-col items-start gap-2">
                      <span className="rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                        ⚠ Already applied
                      </span>
                      <Link
                        href={`/job-postings/${p.public_id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href={`/job-postings/${p.public_id}`}
                      className="inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Apply
                    </Link>
                  )}
                </td>              
              </tr>
            ))}
            {postings.length === 0 && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-gray-500">
                  No job postings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}