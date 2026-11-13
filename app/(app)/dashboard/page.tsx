import { requireRole } from "@/app/lib/auth";
import { ALL_ROLES } from "@/app/lib/roles";
import ApplicantOverview from "./applicant-overview";
import StaffOverview from "./staff-overview"
import AdminOverview from "./admin-overview";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireRole(ALL_ROLES);

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>

      {user.role === "applicant" && <ApplicantOverview userId={user.id} />}
      {(user.role === "recruiter" ||
        user.role === "hiring_manager" ||
        user.role === "company_admin") && <StaffOverview user={user} />}
      {user.role === "admin" && <AdminOverview />}
    </div>
  );
}