import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
import { requireRole } from "@/app/lib/auth";
import { VIEW_USERS, ALL_ROLES } from "@/app/lib/roles";
import SearchInput from "./search-input";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

const LIMIT = 50;
const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(VIEW_USERS);

  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v ?? "").trim();
  };
  const q = one("q");
  const role = ALL_ROLES.includes(one("role") as any) ? one("role") : "";

  // Only query when the admin has actually searched
  const searched = q !== "" || role !== "";
  let users: RowDataPacket[] = [];

  if (searched) {
    const where: string[] = [];
    const params: (string | number)[] = [];

    // Every word must match the first name, last name, or email
    for (const token of q.split(/\s+/).filter(Boolean).slice(0, 5)) {
      const like = `%${escapeLike(token)}%`;
      where.push("(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)");
      params.push(like, like, like);
    }
    if (role) {
      where.push("u.user_sub_group = ?");
      params.push(role);
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.user_sub_group, u.date_created,
              (SELECT c.name FROM company c
               WHERE c.id = COALESCE(
                 (SELECT cm.company_id FROM company_members cm WHERE cm.user_id = u.id),
                 (SELECT ca.company_id FROM company_admins ca WHERE ca.user_id = u.id LIMIT 1)
               )) AS company_name
       FROM users u
       WHERE ${where.join(" AND ")}
       ORDER BY u.last_name, u.first_name
       LIMIT ${LIMIT + 1}`,
      params
    );
    users = rows;
  }

  const hasMore = users.length > LIMIT;
  const shown = users.slice(0, LIMIT);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Users</h1>

      <form method="get" className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="q" className="block text-sm font-medium text-gray-700">
              Search by name or email
            </label>
            <Suspense
            fallback={
                <input disabled className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
            }
            >
            <SearchInput />
            </Suspense>
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
            <select id="role" name="role" defaultValue={role}
              className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="">Any</option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Search
          </button>
          {searched && (
            <Link href="/users" className="text-sm text-gray-600 hover:underline">Clear</Link>
          )}
        </div>
      </form>

      {!searched ? (
        <p className="rounded-lg border bg-white p-6 text-center text-sm text-gray-500">
          Search for a user to see results.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-gray-500">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Company</th>
                <th className="p-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{u.first_name} {u.last_name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                      {u.user_sub_group}
                    </span>
                  </td>
                  <td className="p-3">{u.company_name || "—"}</td>
                  <td className="p-3">{new Date(u.date_created).toLocaleDateString()}</td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {hasMore && (
            <p className="border-t p-3 text-center text-xs text-gray-500">
              Showing the first {LIMIT} matches. Narrow your search to see others.
            </p>
          )}
        </div>
      )}
    </div>
  );
}