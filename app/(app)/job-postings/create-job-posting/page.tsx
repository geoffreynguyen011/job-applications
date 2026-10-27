import { requireRole } from "@/app/lib/auth";
import JobPostingForm from "./job-posting-form";

export default async function CreateJobPostingPage() {
  await requireRole(["recruiter", "admin", "company_admin"]);
  return <JobPostingForm />;
}