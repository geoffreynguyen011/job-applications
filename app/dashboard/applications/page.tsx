import { fetchApplications } from "@/app/lib/data";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Status = "in_consideration" | "accepted" | "declined";

const statusStyles: Record<Status, string> = {
  in_consideration: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
};

const statusLabels: Record<Status, string> = {
  in_consideration: "In consideration",
  accepted: "Accepted",
  declined: "Declined",
};

function formatPay(currency: string, min: string, max: string) {
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  return `${fmt.format(Number(min))} – ${fmt.format(Number(max))}`;
}

export default async function ApplicationsPage() {
  const applications = await fetchApplications();

  const counts = {
    total: applications.length,
    in_consideration: applications.filter((r) => r.application_status === "in_consideration").length,
    accepted: applications.filter((r) => r.application_status === "accepted").length,
    declined: applications.filter((r) => r.application_status === "declined").length,
  };

  const stats = [
    { label: "Total Applications", value: counts.total },
    { label: "In Consideration", value: counts.in_consideration },
    { label: "Accepted", value: counts.accepted },
    { label: "Declined", value: counts.declined },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Applications</h1>
        <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Applications</h1>
        <Link
            href="/dashboard/applications/new"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
            New application
        </Link>
        </div>        
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-500">
            <tr>
              <th className="p-3">Applicant</th>
              <th className="p-3">Company</th>
              <th className="p-3">Location</th>
              <th className="p-3">Pay Range</th>
              <th className="p-3">Applied</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="p-3">
                  <div className="font-medium">
                    {r.first_name} {r.last_name}
                  </div>
                  <div className="text-xs text-gray-500">{r.email}</div>
                </td>
                <td className="p-3">{r.company_name}</td>
                <td className="p-3">{r.location}</td>
                <td className="p-3">
                  {formatPay(r.currency, r.minimum_pay, r.maximum_pay)}
                </td>
                <td className="p-3">
                  {new Date(r.date_applied).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      statusStyles[r.application_status as Status]
                    }`}
                  >
                    {statusLabels[r.application_status as Status]}
                  </span>
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500">
                  No applications yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}