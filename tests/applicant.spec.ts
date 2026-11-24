import { test, expect } from "@playwright/test";

test.use({ storageState: "playwright/.auth/applicant.json" });

test.describe("applications pagination", () => {
  test("page 1 shows at most 10 rows and a pager", async ({ page }) => {
    await page.goto("/applications");
    const rows = await page.locator("tbody tr").count();
    expect(rows).toBeLessThanOrEqual(10);
    await expect(page.getByText(/Page 1 of 2/)).toBeVisible();
  });

  test("Next goes to page 2, Previous returns", async ({ page }) => {
    await page.goto("/applications");
    await page.getByRole("link", { name: /Next/ }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Page 2 of 2/)).toBeVisible();
    await page.getByRole("link", { name: /Previous/ }).click();
    await expect(page.getByText(/Page 1 of 2/)).toBeVisible();
  });

  test("a page past the end redirects to the last page", async ({ page }) => {
    await page.goto("/applications?page=999");
    await expect(page).toHaveURL(/page=2/);
  });

  test("an invalid page number falls back to page 1", async ({ page }) => {
    await page.goto("/applications?page=abc");
    await expect(page.getByText(/Page 1 of 2/)).toBeVisible();
  });
});

test.describe("overview", () => {
  test("shows applicant sections only", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Application updates")).toBeVisible();
    await expect(page.getByText("Open jobs you haven't applied to")).toBeVisible();
    await expect(page.getByText("Hiring pipeline")).toHaveCount(0);
  });

  test("interview Accept needs a second click to confirm", async ({ page }) => {
    await page.goto("/dashboard");
    const invite = page.locator("li", { hasText: "Interview invitations" }).or(page.locator("section", { hasText: "Interview invitations" }));
    await invite.getByRole("button", { name: "Accept" }).first().click();
    await expect(invite.getByRole("button", { name: "Confirm?" })).toBeVisible();
    // Cancel without confirming so the seed data stays intact
    await invite.getByRole("button", { name: "Cancel" }).click();
    await expect(invite.getByRole("button", { name: "Accept" }).first()).toBeVisible();
  });
});

test.describe("settings", () => {
  test("account fields are locked until 'Edit account' is clicked", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByLabel("First name")).toBeDisabled();
    await page.getByRole("button", { name: "Edit account" }).click();
    await expect(page.getByLabel("First name")).toBeEnabled();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByLabel("First name")).toBeDisabled();
  });

  test("changing an email without the password fails", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Edit account" }).click();
    await page.getByLabel("Email").fill("someone.else@example.com");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(/current password to change your email/i)).toBeVisible();
  });
});

test.describe("sidebar", () => {
  test("applicants see Applications but not Review, Users, or Companies", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "Applications", exact: true })).toBeVisible();
    for (const name of ["Review Applications", "Users", "Companies", "Create Job Postings"]) {
      await expect(page.getByRole("link", { name })).toHaveCount(0);
    }
  });
});