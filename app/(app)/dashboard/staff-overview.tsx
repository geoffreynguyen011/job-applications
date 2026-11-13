import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
import { getUserCompanyId } from "@/app/lib/auth";
import { Stat, Card, fmtDateTime } from "./ui";

// Every query is limited to the user's own company
const SCOPE = `jp.company_id IN (
  SELECT company_id FROM company_members WHERE user_id = ?
  UNION
  SELECT company_id FROM company_admins WHERE user_id = ?)`;

const n = (v: unknown) => Number(v ?? 0);

export default async function StaffOverview({ user }: { user: { id: number; role: string } }) {
  const companyId = await getUserCompanyId(user.id);
  if (!companyId) {
    return (
      <p className="rounded-lg border bg-white p-6 text-sm text-gray-600">
        Your account isn't linked to a company yet, so there's nothing to show.
      </p>
    );
  }
  const p = [user.id, user.id];

  const [statRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       COUNT(DISTINCT jp.id) AS postings,
       COUNT(DISTINCT CASE WHEN jp.date_closed IS NULL OR jp.date_closed >= CURDATE()
                           THEN jp.id END) AS open_postings,
       COUNT(sa.applicant_id) AS applications,
       SUM(sa.application_status = 'in_consideration') AS in_consideration,
       SUM(sa.application_status = 'accepted') AS accepted,
       SUM(sa.application_status = 'declined') AS declined
     FROM job_postings jp
     LEFT JOIN submitted_applications sa ON sa.job_description_id = jp.id
     WHERE ${SCOPE}`,
    p
  );
  const s = statRows[0];

  const [interviews] = await pool.query<RowDataPacket[]>(
    `SELECT i.id, i.scheduled_at, i.format, i.applicant_response,
            u.first_name, u.last_name, jp.job_title, jp.public_id
     FROM interviews i
     JOIN job_postings jp ON jp.id = i.job_posting_id
     JOIN users u ON u.id = i.applicant_id
     WHERE i.status = 'scheduled' AND i.scheduled_at >= NOW() AND ${SCOPE}
     ORDER BY i.scheduled_at
     LIMIT 30`,
    p
  );

  const [awaiting] = await pool.query<RowDataPacket[]>(
    `SELECT u.first_name, u.last_name, jp.job_title, jp.public_id, sa.date_applied
     FROM submitted_applications sa
     JOIN users u ON u.id = sa.applicant_id
     JOIN job_postings jp ON jp.id = sa.job_description_id
     WHERE sa.application_status = 'in_consideration' AND ${SCOPE}
     ORDER BY sa.date_applied
     LIMIT 8`,
    p
  );

  const [closingSoon] = await pool.query<RowDataPacket[]>(
    `SELECT jp.public_id, jp.job_title, jp.date_closed,
            (SELECT COUNT(*) FROM submitted_applications sa
             WHERE sa.job_description_id = jp.id) AS applicant_count
     FROM job_postings jp
     WHERE ${SCOPE}
       AND jp.date_closed BETWEEN CURDATE() AND CURDATE() + INTERVAL 7 DAY
     ORDER BY jp.date_closed`,
    p
  );

  let team: RowDataPacket[] = [];
  if (user.role === "company_admin") {
    [team] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.user_sub_group
       FROM users u
       WHERE u.id IN (
         SELECT user_id FROM company_members WHERE company_id = ?
         UNION
         SELECT user_id FROM company_admins WHERE company_id = ?)
       ORDER BY u.last_name`,
      [companyId, companyId]
    );
  }

  const confirmed = interviews.filter((i) => i.applicant_response === "accepted");
  const pending = interviews.filter((i) => i.applicant_response === "pending");
  const declined = interviews.filter((i) => i.applicant_response === "declined");

  const interviewList = (rows: RowDataPacket[]) => (
    <ul className="space-y-3 text-sm">
      {rows.map((i) => (
        <li key={i.id}>
          <p className="font-medium">{i.first_name} {i.last_name}</p>
          <p className="text-gray-700">
            {i.job_title} · {fmtDateTime(i.scheduled_at)} · {i.format}
          </p>
          <Link href={`/job-postings/${i.public_id}/applications`}
            className="text-blue-600 hover:underline">
            View applicant
          </Link>
        </li>
      ))}
    </ul>
  );

  const pipeline = [
    { label: "In consideration", value: n(s.in_consideration), bar: "bg-yellow-400" },
    { label: "Accepted", value: n(s.accepted), bar: "bg-green-500" },
    { label: "Declined", value: n(s.declined), bar: "bg-red-400" },
  ];
  const total = Math.max(n(s.applications), 1);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open postings" value={n(s.open_postings)} />
        <Stat label="Applications" value={n(s.applications)} />
        <Stat label="Awaiting review" value={n(s.in_consideration)} tone={n(s.in_consideration) ? "warn" : undefined} />
        <Stat label="Confirmed interviews" value={confirmed.length} tone={confirmed.length ? "good" : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Confirmed interviews" isEmpty={confirmed.length === 0}
          emptyText="No applicants have confirmed an interview yet.">
          {interviewList(confirmed)}
        </Card>
        <Card title="Awaiting applicant response" isEmpty={pending.length === 0}
          emptyText="No pending invitations.">
          {interviewList(pending)}
        </Card>
      </div>

      {declined.length > 0 && (
        <Card title="Declined: needs rescheduling">{interviewList(declined)}</Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Applicants awaiting review" isEmpty={awaiting.length === 0}
          emptyText="You're all caught up.">
          <ul className="divide-y text-sm">
            {awaiting.map((a, idx) => (
              <li key={idx} className="flex items-center justify-between py-2">
                <span>
                  <span className="font-medium">{a.first_name} {a.last_name}</span>
                  <span className="text-gray-500">
                    {" "}· {a.job_title} · applied {new Date(a.date_applied).toLocaleDateString()}
                  </span>
                </span>
                <Link href={`/job-postings/${a.public_id}/applications`}
                  className="text-blue-600 hover:underline">
                  Review
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Postings closing in 7 days" isEmpty={closingSoon.length === 0}
          emptyText="No postings closing soon.">
          <ul className="divide-y text-sm">
            {closingSoon.map((j) => (
              <li key={j.public_id} className="flex items-center justify-between py-2">
                <span>
                  <span className="font-medium">{j.job_title}</span>
                  <span className="text-gray-500">
                    {" "}· closes {new Date(j.date_closed).toLocaleDateString()} · {j.applicant_count} applicants
                  </span>
                </span>
                <Link href={`/job-postings/${j.public_id}/applications`}
                  className="text-blue-600 hover:underline">
                  Applicants
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Hiring pipeline" isEmpty={n(s.applications) === 0} emptyText="No applications yet.">
        <div className="space-y-3 text-sm">
          {pipeline.map((r) => (
            <div key={r.label}>
              <div className="mb-1 flex justify-between">
                <span>{r.label}</span><span className="text-gray-500">{r.value}</span>
              </div>
              <div className="h-2 rounded bg-gray-100">
                <div className={`h-2 rounded ${r.bar}`} style={{ width: `${(r.value / total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {user.role === "company_admin" && (
        <Card title="Your team" isEmpty={team.length === 0} emptyText="No team members yet.">
          <ul className="divide-y text-sm">
            {team.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <span>
                  <span className="font-medium">{t.first_name} {t.last_name}</span>
                  <span className="text-gray-500"> · {t.email}</span>
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {t.user_sub_group}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}