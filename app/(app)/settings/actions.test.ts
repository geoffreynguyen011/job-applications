import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

const { requireRole, query } = vi.hoisted(() => ({ requireRole: vi.fn(), query: vi.fn() }));

vi.mock("@/app/lib/auth", () => ({ requireRole }));
vi.mock("@/app/lib/db", () => ({ pool: { query } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateAccount, changePassword } from "./actions";

const hash = bcrypt.hashSync("oldpassword", 4); // low cost = fast tests
const form = (f: Record<string, string>) => {
  const fd = new FormData();
  Object.entries(f).forEach(([k, v]) => fd.set(k, v));
  return fd;
};

beforeEach(() => {
  vi.clearAllMocks();
  requireRole.mockResolvedValue({ id: 7, role: "applicant" });
});

describe("updateAccount", () => {
  const base = { first_name: "Al", last_name: "Lee", email: "al@example.com" };

  it("rejects an invalid email", async () => {
    const r = await updateAccount({}, form({ ...base, email: "nope" }));
    expect(r.error).toMatch(/valid email/i);
  });

  it("lets you change your name without a password", async () => {
    query
      .mockResolvedValueOnce([[{ email: "al@example.com", password: hash }]])
      .mockResolvedValueOnce([{}]);
    const r = await updateAccount({}, form({ ...base, first_name: "Alan" }));
    expect(r.success).toBeTruthy();
  });

  it("requires the current password to change the email", async () => {
    query.mockResolvedValueOnce([[{ email: "old@example.com", password: hash }]]);
    const r = await updateAccount({}, form(base));
    expect(r.error).toMatch(/current password/i);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("rejects a wrong password on email change", async () => {
    query.mockResolvedValueOnce([[{ email: "old@example.com", password: hash }]]);
    const r = await updateAccount({}, form({ ...base, current_password: "wrong" }));
    expect(r.error).toMatch(/current password/i);
  });

  it("changes the email with the right password", async () => {
    query
      .mockResolvedValueOnce([[{ email: "old@example.com", password: hash }]])
      .mockResolvedValueOnce([{}]);
    const r = await updateAccount({}, form({ ...base, current_password: "oldpassword" }));
    expect(r.success).toBeTruthy();
  });

  it("reports a duplicate email", async () => {
    query
      .mockResolvedValueOnce([[{ email: "old@example.com", password: hash }]])
      .mockRejectedValueOnce({ code: "ER_DUP_ENTRY" });
    const r = await updateAccount({}, form({ ...base, current_password: "oldpassword" }));
    expect(r.error).toMatch(/already in use/i);
  });

  it("only updates the logged-in user's row", async () => {
    query
      .mockResolvedValueOnce([[{ email: "al@example.com", password: hash }]])
      .mockResolvedValueOnce([{}]);
    await updateAccount({}, form({ ...base, id: "999" }));
    expect(query.mock.calls[1][1].at(-1)).toBe(7);
  });
});

describe("changePassword", () => {
  const ok = { current_password: "oldpassword", new_password: "newpassword1", confirm_password: "newpassword1" };

  it("requires at least 8 characters", async () => {
    const r = await changePassword({}, form({ ...ok, new_password: "short", confirm_password: "short" }));
    expect(r.error).toMatch(/at least 8/i);
  });

  it("requires the confirmation to match", async () => {
    const r = await changePassword({}, form({ ...ok, confirm_password: "different1" }));
    expect(r.error).toMatch(/don't match/i);
  });

  it("rejects a wrong current password", async () => {
    query.mockResolvedValueOnce([[{ password: hash }]]);
    const r = await changePassword({}, form({ ...ok, current_password: "nope" }));
    expect(r.error).toMatch(/incorrect/i);
  });

  it("stores a hash, never the plain password", async () => {
    query.mockResolvedValueOnce([[{ password: hash }]]).mockResolvedValueOnce([{}]);
    const r = await changePassword({}, form(ok));
    expect(r.success).toBeTruthy();
    const stored = query.mock.calls[1][1][0];
    expect(stored).not.toBe("newpassword1");
    expect(await bcrypt.compare("newpassword1", stored)).toBe(true);
  });
});