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
export const VIEW_PROFILE: Role[] = ALL_ROLES;
export const SUMMARY_ROLES: Role[] = ["applicant", "recruiter", "hiring_manager", "company_admin"];
export const PROFILE_PICTURE_ROLES: Role[] = ["applicant"]; // maybe change to all_roles later
export const VIEW_APPLICATIONS: Role[] = ["applicant"];
export const CREATE_JOB_POSTINGS: Role[] = ["recruiter", "company_admin", "hiring_manager"];
export const REVIEW_APPLICATIONS: Role[] = ["recruiter", "company_admin", "hiring_manager"];
export const VIEW_SETTINGS: Role[] = ALL_ROLES;
export const VIEW_USERS: Role[] = ["admin"];
export const VIEW_COMPANIES: Role[] = ["admin"];
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  company_admin: "Company admin",
  recruiter: "Recruiter",
  hiring_manager: "Hiring manager",
  applicant: "Applicant",
};
