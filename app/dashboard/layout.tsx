import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="w-56 border-r bg-white p-4">
        <h2 className="mb-6 text-lg font-bold">My Dashboard</h2>
        <nav className="flex flex-col gap-2">
          <Link href="/dashboard" className="rounded px-3 py-2 hover:bg-gray-100">
            Overview
          </Link>
          <Link href="/dashboard/users" className="rounded px-3 py-2 hover:bg-gray-100">
            Users
          </Link>
          <Link href="/dashboard/applications" className="rounded px-3 py-2 hover:bg-gray-100">
            Applications
          </Link>
          <Link href="/dashboard/settings" className="rounded px-3 py-2 hover:bg-gray-100">
            Settings
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}