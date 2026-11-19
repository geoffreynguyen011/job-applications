import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { fetchApplications, PAGE_SIZE } from "@/app/lib/data";
import { requireRole } from "@/app/lib/auth";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
import { VIEW_APPLICATIONS } from "@/app/lib/roles";

export const dynamic = "force-dynamic";

const statusStyles = {
  in_consideration: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
} as const;

const statusLabels = {
  in_consideration: "In consideration",
  accepted: "Accepted",
  declined: "Declined",
} as const;

function formatPay(currency: string, min: string, max: string) {
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  return `${fmt.format(Number(min))} – ${fmt.format(Number(max))}`;
}

export default async function ApplicationsPage({
    searchParams,
  }: {
    searchParams: Promise<{ page?: string | string[] }>;
  }) {
    const user = await requireRole(VIEW_APPLICATIONS);
    const isApplicant = user.role === "applicant";

    const sp = await searchParams;
    const raw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
    const requested = /^\d+$/.test(raw ?? "") ? Number(raw) : 1;

    let { rows: applications, total } = await fetchApplications(user, requested);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // A page past the end (for example after a deletion) goes to the last page
    if (requested > totalPages) redirect(`/applications?page=${totalPages}`);
    const page = Math.max(1, requested);

  const [interviews] = await pool.query<RowDataPacket[]>(
    `SELECT i.scheduled_at, i.duration_minutes, i.format, i.location, i.notes,
            jp.job_title, jp.public_id, c.name AS company_name
    FROM interviews i
    JOIN job_postings jp ON jp.id = i.job_posting_id
    JOIN company c ON c.id = jp.company_id
    WHERE i.applicant_id = ? AND i.status = 'scheduled' AND i.scheduled_at >= NOW()
    ORDER BY i.scheduled_at`,
    [user.id]
  );

  return (
    <div>
      <Link
      href="/dashboard"
      className="text-sm text-gray-600 hover:underline"
    >
      ← Back to dashboard
    </Link>
      <h1 className="mb-6 text-2xl font-bold">
        {isApplicant ? "My Applications" : "Applications"}
      </h1>
      {interviews.length > 0 && (
        <section className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Upcoming interviews</h2>
          <ul className="space-y-3 text-sm">
            {interviews.map((i, n) => (
              <li key={n}>
                <p className="font-medium">
                  {i.job_title} at {i.company_name}
                </p>
                <p className="text-gray-700">
                  {new Date(i.scheduled_at).toLocaleString()} · {i.duration_minutes} min · {i.format}
                </p>
                {i.location && <p className="text-gray-500">{i.location}</p>}
                {i.notes && <p className="mt-1 whitespace-pre-line text-gray-500">{i.notes}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-500">
            <tr>
              {!isApplicant && <th className="p-3">Applicant</th>}
              <th className="p-3">Job</th>
              <th className="p-3">Company</th>
              <th className="p-3">Location</th>
              <th className="p-3">Pay range</th>
              <th className="p-3">Applied</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((a) => (
              <tr
                key={`${a.public_id}-${a.applicant_name}`}
                className="border-b last:border-0"
              >
                {!isApplicant && <td className="p-3">{a.applicant_name}</td>}
                <td className="p-3">
                  <Link
                    href={`/job-postings/${a.public_id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {a.job_title}
                  </Link>
                </td>
                <td className="p-3">{a.company_name}</td>
                <td className="p-3">{a.location}</td>
                <td className="p-3 whitespace-nowrap">
                  {formatPay(a.currency, a.minimum_pay, a.maximum_pay)}
                </td>
                <td className="p-3">
                  {new Date(a.date_applied).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[a.application_status]}`}
                  >
                    {statusLabels[a.application_status]}
                  </span>
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td
                  colSpan={isApplicant ? 6 : 7}
                  className="p-6 text-center text-gray-500"
                >
                  {isApplicant
                    ? "You haven't applied to any jobs yet."
                    : "No applications to show."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
      <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
        <p className="text-gray-500">
          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
        </p>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={`/applications?page=${page - 1}`}
              className="rounded border bg-white px-3 py-1.5 hover:bg-gray-50"
            >
              ← Previous
            </Link>
          ) : (
            <span className="rounded border px-3 py-1.5 text-gray-300">← Previous</span>
          )}
          <span className="px-2 text-gray-600">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Link
              href={`/applications?page=${page + 1}`}
              className="rounded border bg-white px-3 py-1.5 hover:bg-gray-50"
            >
              Next →
            </Link>
          ) : (
            <span className="rounded border px-3 py-1.5 text-gray-300">Next →</span>
          )}
        </div>
      </nav>
    )}
    </div>
  );
}