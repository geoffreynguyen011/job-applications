import Link from "next/link";
import { notFound } from "next/navigation";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
import { requireRole, canManageCompany } from "@/app/lib/auth";
import { REVIEW_APPLICATIONS } from "@/app/lib/roles";
import ScheduleInterview from "./schedule-interview";
import { cancelInterview } from "./actions";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
  return `${fmt.format(Number(min))} – ${fmt.format(Number(max))}`;
}
const formatDate = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString() : "—");

export default async function JobApplicationsPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireRole(REVIEW_APPLICATIONS);

  const { publicId } = await params;
  if (!UUID.test(publicId)) notFound();

  const [jobRows] = await pool.query<RowDataPacket[]>(
    `SELECT jp.id, jp.company_id, jp.public_id, jp.job_title, jp.job_description,
            jp.availability, jp.job_length, jp.location, jp.currency,
            jp.minimum_pay, jp.maximum_pay, jp.date_posted, jp.date_closed,
            c.name AS company_name
     FROM job_postings jp
     JOIN company c ON c.id = jp.company_id
     WHERE jp.public_id = ?`,
    [publicId]
  );
  const job = jobRows[0];
  if (!job) notFound();

  // Only people at this posting's company may see its applicants.
  // notFound (not 403) so we don't reveal that the posting exists.
  if (!(await canManageCompany(user.id, job.company_id))) notFound();

  const [applicants] = await pool.query<RowDataPacket[]>(
    `SELECT u.id, u.first_name, u.last_name, u.email,
            a.degree, a.field_of_study, a.university, a.location, a.summary,
            sa.application_status, sa.date_applied
     FROM submitted_applications sa
     JOIN users u ON u.id = sa.applicant_id
     LEFT JOIN applicants a ON a.user_id = sa.applicant_id
     WHERE sa.job_description_id = ?
     ORDER BY sa.date_applied DESC`,
    [job.id]
  );

  const [interviewRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, applicant_id, scheduled_at, duration_minutes, format, location, notes, status
    FROM interviews
    WHERE job_posting_id = ? AND status <> 'cancelled'
    ORDER BY scheduled_at`,
    [job.id]
    );
    const interviewsByApplicant = new Map<number, RowDataPacket[]>();
    for (const i of interviewRows) {
        interviewsByApplicant.set(i.applicant_id, [
            ...(interviewsByApplicant.get(i.applicant_id) ?? []),
            i,
        ]);
    }

  const jobDetails = [
    { label: "Location", value: job.location },
    { label: "Type", value: job.availability || "—" },
    { label: "Length", value: job.job_length },
    { label: "Pay range", value: formatPay(job.currency, job.minimum_pay, job.maximum_pay) },
    { label: "Posted", value: formatDate(job.date_posted) },
    { label: "Closes", value: formatDate(job.date_closed) },
  ];

  return (
    <div className="max-w-4xl">
      <Link href="/review" className="text-sm text-gray-600 hover:underline">
        ← Back to review applications
      </Link>

      {/* Job details */}
      <div className="mt-4 rounded-lg border bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-gray-500">{job.company_name}</p>
        <h1 className="mt-1 text-2xl font-bold">{job.job_title}</h1>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          {jobDetails.map((d) => (
            <div key={d.label}>
              <dt className="text-xs uppercase tracking-wide text-gray-500">{d.label}</dt>
              <dd className="mt-1 text-sm font-medium">{d.value}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mb-2 mt-6 text-lg font-semibold">Job description</h2>
        <p className="whitespace-pre-line text-sm text-gray-700">{job.job_description}</p>
      </div>

      {/* Applicants */}
      <h2 className="mb-4 mt-8 text-xl font-semibold">
        Applicants ({applicants.length})
      </h2>

      <div className="space-y-4">
        {applicants.map((a) => (
          <div key={a.id} className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {a.first_name} {a.last_name}
                </h3>
                <a href={`mailto:${a.email}`} className="text-sm text-blue-600 hover:underline">
                  {a.email}
                </a>
              </div>
              <div className="text-right">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[a.application_status as keyof typeof statusStyles]}`}
                >
                  {statusLabels[a.application_status as keyof typeof statusLabels]}
                </span>
                <p className="mt-2 text-xs text-gray-500">
                  Applied {formatDate(a.date_applied)}
                </p>
              </div>
            </div>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ["Degree", a.degree],
                ["Field of study", a.field_of_study],
                ["University", a.university],
                ["Location", a.location],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
                  <dd className="mt-1 text-sm">{value || "—"}</dd>
                </div>
              ))}
            </dl>

            <h4 className="mb-1 mt-4 text-xs uppercase tracking-wide text-gray-500">Summary</h4>
            <p className="whitespace-pre-line text-sm text-gray-700">
              {a.summary || "No summary provided."}
            </p>
            {(interviewsByApplicant.get(a.id) ?? []).map((i) => (
                <div key={i.id} className="mt-4 flex items-start justify-between gap-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm">
                    <div>
                    <p className="font-medium text-blue-900">
                        Interview: {new Date(i.scheduled_at).toLocaleString()} ({i.duration_minutes} min, {i.format})
                    </p>
                    {i.location && <p className="text-blue-800">{i.location}</p>}
                    </div>
                    {i.status === "scheduled" && (
                    <form action={cancelInterview}>
                        <input type="hidden" name="interview_id" value={i.id} />
                        <button className="text-xs text-red-600 hover:underline">Cancel</button>
                    </form>
                    )}
                </div>
                ))}

            <ScheduleInterview publicId={publicId} applicantId={a.id} />
          </div>
        ))}

        {applicants.length === 0 && (
          <p className="rounded-lg border bg-white p-6 text-center text-sm text-gray-500">
            No one has applied to this job yet.
          </p>
        )}
      </div>
    </div>
  );
}