import { test, expect } from "@playwright/test";

test.describe("recruiter", () => {
  test.use({ storageState: "playwright/.auth/recruiter.json" });

  test("review page lists only their own company's postings", async ({ page }) => {
    await page.goto("/review");
    await expect(page.getByText("Frontend Developer")).toBeVisible();   // Acme
    await expect(page.getByText("Backend Engineer")).toHaveCount(0);    // Globex
  });

  test("overview shows the staff sections", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Confirmed interviews").first()).toBeVisible();
    await expect(page.getByText("Hiring pipeline")).toBeVisible();
    await expect(page.getByText("Open jobs you haven't applied to")).toHaveCount(0);
  });

  test("can open an applicants page for their own company", async ({ page }) => {
    await page.goto("/review");
    await page.getByRole("link", { name: "View applications" }).first().click();
    await expect(page.getByText(/Applicants \(\d+\)/)).toBeVisible();
  });
});

test.describe("company admin", () => {
  test.use({ storageState: "playwright/.auth/company_admin.json" });

  test("overview includes the team list", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Your team")).toBeVisible();
  });
});

test.describe("admin", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("users page shows nothing until you search", async ({ page }) => {
    await page.goto("/users");
    await expect(page.getByText("Search for a user to see results.")).toBeVisible();
  });

  test("searching by name returns matching users", async ({ page }) => {
    await page.goto("/users?q=alice");
    await expect(page.getByText("alice@example.com")).toBeVisible();
  });

  test("role filter narrows the results", async ({ page }) => {
    await page.goto("/users?role=admin");
    await expect(page.locator("tbody tr")).toHaveCount(1);
  });

  test("never shows password hashes", async ({ page }) => {
    await page.goto("/users?q=alice");
    await expect(page.getByText(/\$2[aby]\$/)).toHaveCount(0);
  });

  test("companies list links to a summary page", async ({ page }) => {
    await page.goto("/companies");
    await page.getByRole("link", { name: "View summary" }).first().click();
    await expect(page.getByText("Administrators")).toBeVisible();
  });

  test("overview shows system-wide stats", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Users by role")).toBeVisible();
  });
});