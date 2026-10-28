import { test, expect } from "@playwright/test";
import { USERS, type Role } from "./users";

const ALL_ROLES = Object.keys(USERS) as Role[];

// One row per protected page: who may see it, and a heading proving the page rendered
const pages: { path: string; allowed: Role[]; heading: string }[] = [
  {
    path: "/create-company",
    allowed: ["company_admin"],
    heading: "Create New Company",
  },
  { 
    path: "/applications", 
    allowed: ["applicant"], 
    heading: "My Applications" },
  {
    path: "/job-postings/create-job-posting",
    allowed: ["recruiter", "company_admin", "hiring_manager"],
    heading: "Create Job Posting",
  },
  { path: "/job-postings", allowed: ALL_ROLES, heading: "Job Postings" },
];

// Logged-out visitors
test.describe("logged out", () => {
  for (const p of pages) {
    test(`${p.path} redirects to /login`, async ({ page }) => {
      await page.goto(p.path);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

// Every role against every page
for (const role of ALL_ROLES) {
  test.describe(`as ${role}`, () => {
    test.use({ storageState: `playwright/.auth/${role}.json` });

    for (const p of pages) {
      const canAccess = p.allowed.includes(role);

      test(`${canAccess ? "can" : "cannot"} open ${p.path}`, async ({ page }) => {
        await page.goto(p.path);
        const heading = page.getByRole("heading", { name: p.heading });

        if (canAccess) {
          await expect(heading).toBeVisible();
        } else {
          await expect(page.getByRole("heading", { name: "403" })).toBeVisible();
          await expect(heading).toHaveCount(0);
        }
      });
    }
  });
}

// Sidebar links match the role
test.describe("sidebar", () => {
  test.describe("as applicant", () => {
    test.use({ storageState: "playwright/.auth/applicant.json" });

    test("hides staff links", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.getByRole("link", { name: "Job Postings", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Applications", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Create Job Postings" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
    });
  });

  test.describe("as recruiter", () => {
    test.use({ storageState: "playwright/.auth/recruiter.json" });

    test("sees create job postings but not users", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.getByRole("link", { name: "Create Job Postings" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Applications" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
    });
  });
});