export type Role =
  | "admin"
  | "company_admin"
  | "recruiter"
  | "hiring_manager"
  | "applicant";

export const ALL_ROLES: Role[] = [
  "admin", "company_admin", "recruiter", "hiring_manager", "applicant",
];

export const VIEW_JOB_POSTINGS: Role[] = ALL_ROLES;
export const VIEW_APPLICATIONS: Role[] = ["applicant"];
export const CREATE_JOB_POSTINGS: Role[] = ["recruiter", "company_admin", "hiring_manager"];