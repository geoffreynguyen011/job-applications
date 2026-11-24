import { test, expect } from "@playwright/test";

test.describe("login", () => {
  test("shows an error for a wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill("alice@example.com");
    await page.getByPlaceholder("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });

  test("shows the same error for an unknown email", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill("nobody@example.com");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });

  test("logs out and then blocks protected pages", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill("alice@example.com");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("**/dashboard");

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows the role badge and name in the header", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill("recruiter@example.com");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("**/dashboard");
    await expect(page.getByText("Welcome, Ravi")).toBeVisible();
    await expect(page.getByText("Recruiter", { exact: true })).toBeVisible();
  });
});