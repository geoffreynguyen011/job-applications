export const USERS = {
  applicant: "alice@example.com",
  recruiter: "recruiter@example.com",
  hiring_manager: "manager@example.com",
  company_admin: "companyadmin@example.com",
  admin: "admin@example.com",
} as const;

export type Role = keyof typeof USERS;