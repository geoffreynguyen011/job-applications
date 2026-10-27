import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
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

export default async function JobPostingDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { publicId } = await params;

  // reject anything that isn't a UUID before touching the database
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID.test(publicId)) notFound();

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
      jp.id, jp.public_id, jp.job_title, jp.job_description, jp.availability,
      jp.job_length, jp.location, jp.currency, jp.minimum_pay,
      jp.maximum_pay, jp.date_posted, jp.date_closed,
      c.name AS company_name,
      c.employee_count,
      c.description AS company_description,
      sa.application_status AS my_status,
      sa.date_applied AS my_date_applied
    FROM job_postings jp
    JOIN company c ON c.id = jp.company_id
    LEFT JOIN submitted_applications sa
      ON sa.job_description_id = jp.id AND sa.applicant_id = ?
    WHERE jp.public_id = ?`,
    [user.id, publicId]
  );

  const p = rows[0];
  if (!p) notFound();

  const isOpen = !p.date_closed || new Date(p.date_closed) >= new Date();

  const statusLabels = {
    in_consideration: "in consideration",
    accepted: "accepted",
    declined: "declined",
  } as const;

  const details = [
    { label: "Location", value: p.location },
    { label: "Type", value: p.availability || "—" },
    { label: "Length", value: p.job_length },
    { label: "Pay range", value: formatPay(p.currency, p.minimum_pay, p.maximum_pay) },
    { label: "Posted", value: formatDate(p.date_posted) },
    { label: "Closes", value: formatDate(p.date_closed) },
  ];

  return (
    <div className="max-w-3xl">
      <Link
        href="/job-postings"
        className="text-sm text-gray-600 hover:underline"
      >
        ← Back to job postings
      </Link>

      <div className="mt-4 rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            {p.my_status && (
              <div className="mb-6 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                ⚠ You already applied to this job on{" "}
                {new Date(p.my_date_applied).toLocaleDateString()}. Your application
                is currently{" "}
                <span className="font-semibold">
                  {statusLabels[p.my_status as keyof typeof statusLabels]}
                </span>
                .
              </div>
            )}
            <p className="text-sm font-medium text-gray-500">{p.company_name}</p>
            <h1 className="mt-1 text-2xl font-bold">{p.job_title}</h1>
          </div>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              isOpen ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
            }`}
          >
            {isOpen ? "Open" : "Closed"}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          {details.map((d) => (
            <div key={d.label}>
              <dt className="text-xs uppercase tracking-wide text-gray-500">
                {d.label}
              </dt>
              <dd className="mt-1 text-sm font-medium">{d.value}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mb-2 mt-8 text-lg font-semibold">Job description</h2>
        <p className="whitespace-pre-line text-sm text-gray-700">
          {p.job_description}
        </p>

        <h2 className="mb-2 mt-8 text-lg font-semibold">
          About {p.company_name}
        </h2>
        {p.employee_count && (
          <p className="text-sm text-gray-500">{p.employee_count} employees</p>
        )}
        <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
          {p.company_description || "No company description provided."}
        </p>
      </div>
    </div>
  );
}