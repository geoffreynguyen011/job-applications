import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import { fetchApplications } from "@/app/lib/data";

export const dynamic = "force-dynamic";

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
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  return `${fmt.format(Number(min))} – ${fmt.format(Number(max))}`;
}

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const applications = await fetchApplications(user);
  const isApplicant = user.role === "applicant";

  return (
    <div>
      <Link
      href="/dashboard"
      className="text-sm text-gray-600 hover:underline"
    >
      ← Back to dashboard
    </Link>
      <h1 className="mb-6 text-2xl font-bold">
        {isApplicant ? "My Applications" : "Applications"}
      </h1>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-500">
            <tr>
              {!isApplicant && <th className="p-3">Applicant</th>}
              <th className="p-3">Job</th>
              <th className="p-3">Company</th>
              <th className="p-3">Location</th>
              <th className="p-3">Pay range</th>
              <th className="p-3">Applied</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((a) => (
              <tr
                key={`${a.public_id}-${a.applicant_name}`}
                className="border-b last:border-0"
              >
                {!isApplicant && <td className="p-3">{a.applicant_name}</td>}
                <td className="p-3">
                  <Link
                    href={`/job-postings/${a.public_id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {a.job_title}
                  </Link>
                </td>
                <td className="p-3">{a.company_name}</td>
                <td className="p-3">{a.location}</td>
                <td className="p-3 whitespace-nowrap">
                  {formatPay(a.currency, a.minimum_pay, a.maximum_pay)}
                </td>
                <td className="p-3">
                  {new Date(a.date_applied).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[a.application_status]}`}
                  >
                    {statusLabels[a.application_status]}
                  </span>
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td
                  colSpan={isApplicant ? 6 : 7}
                  className="p-6 text-center text-gray-500"
                >
                  {isApplicant
                    ? "You haven't applied to any jobs yet."
                    : "No applications to show."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}