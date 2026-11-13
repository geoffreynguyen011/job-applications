import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
import { Stat, Card } from "./ui";

export default async function AdminOverview() {
  const [totalsRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM users WHERE date_created >= NOW() - INTERVAL 7 DAY) AS new_users,
       (SELECT COUNT(*) FROM company) AS companies,
       (SELECT COUNT(*) FROM job_postings
        WHERE date_closed IS NULL OR date_closed >= CURDATE()) AS open_postings,
       (SELECT COUNT(*) FROM submitted_applications) AS applications,
       (SELECT COUNT(*) FROM interviews
        WHERE status = 'scheduled' AND scheduled_at >= NOW()) AS interviews`
  );
  const t = totalsRows[0];

  const [byRole] = await pool.query<RowDataPacket[]>(
    "SELECT user_sub_group AS role, COUNT(*) AS n FROM users GROUP BY user_sub_group ORDER BY n DESC"
  );

  const [recent] = await pool.query<RowDataPacket[]>(
    `SELECT id, first_name, last_name, email, user_sub_group, date_created
     FROM users ORDER BY date_created DESC LIMIT 5`
  );

  const [noAdmin] = await pool.query<RowDataPacket[]>(
    `SELECT c.id, c.name FROM company c
     WHERE NOT EXISTS (SELECT 1 FROM company_admins ca WHERE ca.company_id = c.id)`
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Users" value={t.users} />
        <Stat label="New users (7 days)" value={t.new_users} />
        <Stat label="Companies" value={t.companies} />
        <Stat label="Open postings" value={t.open_postings} />
        <Stat label="Applications" value={t.applications} />
        <Stat label="Upcoming interviews" value={t.interviews} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Users by role">
          <ul className="space-y-1 text-sm">
            {byRole.map((r) => (
              <li key={r.role} className="flex justify-between">
                <span>{r.role}</span><span className="text-gray-500">{r.n}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent signups">
          <ul className="space-y-2 text-sm">
            {recent.map((u) => (
              <li key={u.id}>
                <span className="font-medium">{u.first_name} {u.last_name}</span>
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {u.user_sub_group}
                </span>
                <div className="text-gray-500">
                  {u.email} · {new Date(u.date_created).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
          <Link href="/users" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Search users
          </Link>
        </Card>
      </div>

      <Card title="Companies with no administrator" isEmpty={noAdmin.length === 0}
        emptyText="Every company has an administrator.">
        <ul className="divide-y text-sm">
          {noAdmin.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-2">
              <span className="font-medium">{c.name}</span>
              <Link href={`/companies/${c.id}`} className="text-blue-600 hover:underline">
                View summary
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}