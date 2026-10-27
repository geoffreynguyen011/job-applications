import { redirect } from "next/navigation";
import { forbidden } from "next/navigation";
import { getSession } from "@/app/lib/session";
import { getCompanyAdminUserId } from "@/app/lib/auth";
import CompanyForm from "./company-form";

export default async function CreateCompanyPage() {
  const session = await getSession();
  if (!session) redirect("/login"); // not logged in

  if (!(await getCompanyAdminUserId())) forbidden(); // logged in, wrong role

  return <CompanyForm />;
}