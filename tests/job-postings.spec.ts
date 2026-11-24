import { test, expect } from "@playwright/test";

test.describe("as applicant", () => {
  test.use({ storageState: "playwright/.auth/applicant.json" });

  test("sees Apply on open postings only", async ({ page }) => {
    await page.goto("/job-postings");
    const closedRow = page.locator("tbody tr", { hasText: "Closed" }).first();
    await expect(closedRow.getByRole("link", { name: "Apply", exact: true })).toHaveCount(0);

    const openRow = page.locator("tbody tr", { hasText: "Open" })
      .filter({ hasNot: page.getByText("Already applied") }).first();
    await expect(openRow.getByRole("link", { name: "Apply", exact: true })).toBeVisible();
  });

  test("shows 'Already applied' on postings Alice applied to", async ({ page }) => {
    await page.goto("/job-postings?title=frontend");
    await expect(page.getByText("Already applied").first()).toBeVisible();
  });

  test("filters by type", async ({ page }) => {
    await page.goto("/job-postings?type=Part-time");
    const types = await page.locator("tbody tr td:nth-child(3)").allTextContents();
    expect(types.length).toBeGreaterThan(0);
    for (const t of types) expect(t.trim()).toBe("Part-time");
  });

  test("filters by company", async ({ page }) => {
    await page.goto("/job-postings?company=Acme");
    await expect(page.locator("tbody tr").first()).toContainText("Acme Corp");
  });

  test("related-title search finds developer roles for 'engineer'", async ({ page }) => {
    await page.goto("/job-postings?title=engineer");
    await expect(page.getByText("Frontend Developer")).toBeVisible();
  });

  test("shows an empty state when nothing matches", async ({ page }) => {
    await page.goto("/job-postings?title=zzzzqqqq");
    await expect(page.getByText("No jobs match your filters.")).toBeVisible();
  });

  test("clear filters link resets the URL", async ({ page }) => {
    await page.goto("/job-postings?type=Part-time");
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/job-postings$/);
  });

  test("a bad posting id returns a 404", async ({ page }) => {
    const res = await page.goto("/job-postings/not-a-uuid");
    expect(res?.status()).toBe(404);
  });

  test("an old numeric id no longer works", async ({ page }) => {
    const res = await page.goto("/job-postings/3");
    expect(res?.status()).toBe(404);
  });
});

test.describe("as recruiter", () => {
  test.use({ storageState: "playwright/.auth/recruiter.json" });

  test("sees View links but no Apply buttons", async ({ page }) => {
    await page.goto("/job-postings");
    await expect(page.getByRole("link", { name: "Apply", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "View" }).first()).toBeVisible();
  });

  test("can open the create posting form", async ({ page }) => {
    await page.goto("/job-postings/create-job-posting");
    await expect(page.getByRole("heading", { name: "Create Job Posting" })).toBeVisible();
  });
});