import { requireRole } from "@/app/lib/auth";
import { CREATE_JOB_POSTINGS } from "@/app/lib/roles";
import JobPostingForm from "./job-posting-form";

export default async function CreateJobPostingPage() {
  await requireRole(CREATE_JOB_POSTINGS);
  return <JobPostingForm />;
}