import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/app/components/logout-button";
import { getCurrentUser } from "@/app/lib/auth";
import {
  VIEW_JOB_POSTINGS, VIEW_APPLICATIONS, CREATE_JOB_POSTINGS, type Role,
} from "@/app/lib/roles";

const ADMINS: Role[] = ["admin", "company_admin"];

const links: { href: string; label: string; roles?: Role[] }[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/job-postings", label: "Job Postings", roles: VIEW_JOB_POSTINGS },
  { href: "/applications", label: "Applications", roles: VIEW_APPLICATIONS },
  { href: "/job-postings/create-job-posting", label: "Create Job Postings", roles: CREATE_JOB_POSTINGS },
  { href: "/users", label: "Users", roles: ADMINS },
  { href: "/settings", label: "Settings", roles: ADMINS },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const visibleLinks = links.filter((l) => !l.roles || l.roles.includes(user.role));

return (
  <div className="flex min-h-screen bg-gray-50 text-gray-900">
    <aside className="w-56 border-r bg-white p-4">
      <h2 className="mb-6 text-lg font-bold">My Dashboard</h2>
      <nav className="flex flex-col gap-2">
        {visibleLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded px-3 py-2 hover:bg-gray-100"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6 border-t pt-4">
        <LogoutButton />
      </div>
    </aside>

    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-end border-b bg-white px-8 py-4">
        <span className="text-sm text-gray-700">
          Welcome, <span className="font-semibold">{user.firstName}</span>
        </span>
      </header>
      <main className="flex-1 p-8">{children}</main>
    </div>
  </div>
);
}