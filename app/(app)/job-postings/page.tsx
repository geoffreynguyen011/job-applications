import Link from "next/link";
import { pool } from "@/app/lib/db";
import type { RowDataPacket } from "mysql2";
import { buildTitleFilter } from "@/app/lib/job-search";
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

const TYPES = ["Full-time", "Part-time"];

export default async function JobPostingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v ?? "").trim();
  };
  const f = {
    posted: one("posted"),
    min: one("min"),
    max: one("max"),
    type: one("type"),
    location: one("location"),
    title: one("title"),
    company: one("company"),
  };

  // Build a parameterized WHERE clause; user input never goes into the SQL text
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (/^\d{4}-\d{2}-\d{2}$/.test(f.posted)) {
    where.push("jp.date_posted >= ?");
    params.push(f.posted);
  }

  const num = (s: string) => (s !== "" && Number.isFinite(Number(s)) && Number(s) >= 0 ? Number(s) : null);
  const min = num(f.min);
  const max = num(f.max);
  if (min !== null) {
    where.push("jp.maximum_pay >= ?"); // the job can pay at least this much
    params.push(min);
  }
  if (max !== null) {
    where.push("jp.minimum_pay <= ?"); // the job starts at or below this
    params.push(max);
  }

  if (TYPES.includes(f.type)) {
    where.push("jp.availability = ?");
    params.push(f.type);
  }

  if (f.location) {
    where.push("jp.location LIKE ?");
    params.push(`%${f.location.replace(/[\\%_]/g, "\\$&")}%`);
  }

  if (f.company) {
    where.push("c.name LIKE ?");
    params.push(`%${f.company.replace(/[\\%_]/g, "\\$&")}%`);
  }

  const title = buildTitleFilter(f.title);
  if (title) {
    where.push(title.where);
    params.push(...title.params);
  }

  const orderBy = title
    ? `(${title.score}) DESC, jp.date_posted DESC`
    : "jp.date_posted DESC";

  const [postings] = await pool.query<RowDataPacket[]>(
    `SELECT
       jp.id, jp.public_id, c.name AS company_name, jp.job_title,
       jp.availability, jp.job_length, jp.location, jp.currency,
       jp.minimum_pay, jp.maximum_pay, jp.date_posted, jp.date_closed,
       sa.application_status AS my_status,
       sa.date_applied AS my_date_applied
     FROM job_postings jp
     JOIN company c ON c.id = jp.company_id
     LEFT JOIN submitted_applications sa
       ON sa.job_description_id = jp.id AND sa.applicant_id = ?
     ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY ${orderBy}`,
    [user.id, ...params, ...(title ? title.params : [])]
  );

  const filtersActive = Object.values(f).some(Boolean);
  const today = new Date();
  const isOpen = (closed: Date | string | null) =>
    !closed || new Date(closed) >= today;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Job Postings</h1>

      <form method="get" className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700">Company</label>
          <input id="company" name="company" type="text" defaultValue={f.company}
            placeholder="e.g. Acme"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
            <input id="title" name="title" type="text" defaultValue={f.title}
              placeholder="e.g. software engineer"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
            <input id="location" name="location" type="text" defaultValue={f.location}
              placeholder="e.g. Remote or London"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type</label>
            <select id="type" name="type" defaultValue={f.type}
              className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="">Any</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="min" className="block text-sm font-medium text-gray-700">Minimum salary</label>
            <input id="min" name="min" type="number" min="0" step="1000" defaultValue={f.min}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <label htmlFor="max" className="block text-sm font-medium text-gray-700">
              Maximum salary <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input id="max" name="max" type="number" min="0" step="1000" defaultValue={f.max}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <label htmlFor="posted" className="block text-sm font-medium text-gray-700">Posted on or after</label>
            <input id="posted" name="posted" type="date" defaultValue={f.posted}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Apply filters
          </button>
          {filtersActive && (
            <Link href="/job-postings" className="text-sm text-gray-600 hover:underline">
              Clear filters
            </Link>
          )}
        </div>
      </form>

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
                  {filtersActive ? "No jobs match your filters." : "No job postings yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}