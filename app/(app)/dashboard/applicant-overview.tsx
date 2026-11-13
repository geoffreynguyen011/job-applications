import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
import { Stat, Card, fmtDateTime } from "./ui";
import { respondToInterview } from "./actions";

const toneClass = {
  good: "border-green-200 bg-green-50 text-green-800",
  bad: "border-red-200 bg-red-50 text-red-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-gray-200 bg-gray-50 text-gray-700",
} as const;

export default async function ApplicantOverview({ userId }: { userId: number }) {
  const [apps] = await pool.query<RowDataPacket[]>(
    `SELECT jp.public_id, jp.job_title, c.name AS company_name,
            sa.application_status, sa.date_applied,
            (jp.date_closed IS NULL OR jp.date_closed >= CURDATE()) AS is_open
     FROM submitted_applications sa
     JOIN job_postings jp ON jp.id = sa.job_description_id
     JOIN company c ON c.id = jp.company_id
     WHERE sa.applicant_id = ?
     ORDER BY sa.date_applied DESC`,
    [userId]
  );

  const [interviews] = await pool.query<RowDataPacket[]>(
    `SELECT i.id, i.scheduled_at, i.duration_minutes, i.format, i.location, i.notes,
            i.applicant_response, jp.job_title, jp.public_id, c.name AS company_name
     FROM interviews i
     JOIN job_postings jp ON jp.id = i.job_posting_id
     JOIN company c ON c.id = jp.company_id
     WHERE i.applicant_id = ? AND i.status = 'scheduled' AND i.scheduled_at >= NOW()
     ORDER BY i.scheduled_at`,
    [userId]
  );

  const [openJobs] = await pool.query<RowDataPacket[]>(
    `SELECT jp.public_id, jp.job_title, jp.location, c.name AS company_name
     FROM job_postings jp
     JOIN company c ON c.id = jp.company_id
     LEFT JOIN submitted_applications sa
       ON sa.job_description_id = jp.id AND sa.applicant_id = ?
     WHERE sa.applicant_id IS NULL
       AND (jp.date_closed IS NULL OR jp.date_closed >= CURDATE())
     ORDER BY jp.date_posted DESC
     LIMIT 5`,
    [userId]
  );

  const [profileRows] = await pool.query<RowDataPacket[]>(
    "SELECT degree, field_of_study, university, location, summary FROM applicants WHERE user_id = ?",
    [userId]
  );
  const p = profileRows[0] ?? {};
  const missing = Object.entries({
    Degree: p.degree, "Field of study": p.field_of_study,
    University: p.university, Location: p.location, Summary: p.summary,
  }).filter(([, v]) => !v).map(([k]) => k);

  // Derived updates, most important first
  const updates = apps
    .map((a) => {
      const open = Number(a.is_open) === 1;
      const job = `${a.job_title} at ${a.company_name}`;
      if (a.application_status === "accepted")
        return { rank: 0, tone: "good" as const, text: `You were accepted for ${job}.`, a };
      if (a.application_status === "declined")
        return { rank: 1, tone: "bad" as const, text: `You weren't selected for ${job}.`, a };
      if (!open)
        return { rank: 2, tone: "warn" as const, text: `${job} has closed. Your application is still being considered.`, a };
      return { rank: 3, tone: "info" as const, text: `${job} is under review.`, a };
    })
    .sort((x, y) => x.rank - y.rank);

  const needsResponse = interviews.filter((i) => i.applicant_response === "pending");
  const confirmed = interviews.filter((i) => i.applicant_response === "accepted");
  const count = (s: string) => apps.filter((a) => a.application_status === s).length;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Applications" value={apps.length} />
        <Stat label="Under review" value={count("in_consideration")} />
        <Stat label="Upcoming interviews" value={confirmed.length} />
        <Stat label="Accepted" value={count("accepted")} tone={count("accepted") ? "good" : undefined} />
      </div>

      {needsResponse.length > 0 && (
        <Card title="Interview invitations">
          <ul className="space-y-4 text-sm">
            {needsResponse.map((i) => (
              <li key={i.id} className="rounded border border-blue-200 bg-blue-50 p-4">
                <p className="font-medium">{i.job_title} at {i.company_name}</p>
                <p className="text-gray-700">
                  {fmtDateTime(i.scheduled_at)} · {i.duration_minutes} min · {i.format}
                </p>
                {i.location && <p className="text-gray-500">{i.location}</p>}
                {i.notes && <p className="mt-1 whitespace-pre-line text-gray-500">{i.notes}</p>}
                <form action={respondToInterview} className="mt-3 flex gap-2">
                  <input type="hidden" name="interview_id" value={i.id} />
                  <button name="response" value="accepted"
                    className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                    Accept
                  </button>
                  <button name="response" value="declined"
                    className="rounded border bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                    Decline
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Application updates" isEmpty={updates.length === 0}
          emptyText="You haven't applied to any jobs yet.">
          <ul className="space-y-2 text-sm">
            {updates.map((u) => (
              <li key={u.a.public_id} className={`rounded border p-3 ${toneClass[u.tone]}`}>
                <Link href={`/job-postings/${u.a.public_id}`} className="hover:underline">
                  {u.text}
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Upcoming interviews" isEmpty={confirmed.length === 0}
          emptyText="No confirmed interviews yet.">
          <ul className="space-y-3 text-sm">
            {confirmed.map((i) => (
              <li key={i.id}>
                <p className="font-medium">{i.job_title} at {i.company_name}</p>
                <p className="text-gray-700">
                  {fmtDateTime(i.scheduled_at)} · {i.duration_minutes} min · {i.format}
                </p>
                {i.location && <p className="text-gray-500">{i.location}</p>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Open jobs you haven't applied to" isEmpty={openJobs.length === 0}
        emptyText="No open jobs right now.">
        <ul className="divide-y text-sm">
          {openJobs.map((j) => (
            <li key={j.public_id} className="flex items-center justify-between py-2">
              <span>
                <span className="font-medium">{j.job_title}</span>
                <span className="text-gray-500"> · {j.company_name} · {j.location}</span>
              </span>
              <Link href={`/job-postings/${j.public_id}`} className="text-blue-600 hover:underline">
                View
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/job-postings" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
          Browse all jobs
        </Link>
      </Card>

      {missing.length > 0 && (
        <Card title="Complete your profile">
          <p className="text-sm text-gray-700">
            Employers see your profile when you apply. Still missing: {missing.join(", ")}.
          </p>
          <Link href="/settings" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
            Update profile
          </Link>
        </Card>
      )}
    </>
  );
}