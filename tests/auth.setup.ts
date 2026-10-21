import { test as setup } from "@playwright/test";
import { USERS } from "./users";

for (const [role, email] of Object.entries(USERS)) {
  setup(`log in as ${role}`, async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("**/dashboard");
    await page.context().storageState({ path: `playwright/.auth/${role}.json` });
  });
}