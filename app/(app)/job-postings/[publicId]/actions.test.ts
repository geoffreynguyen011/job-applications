import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireRole, query, redirect } = vi.hoisted(() => ({
  requireRole: vi.fn(),
  query: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));

vi.mock("@/app/lib/auth", () => ({ requireRole }));
vi.mock("@/app/lib/db", () => ({ pool: { query } }));
vi.mock("next/navigation", () => ({ redirect }));

import { applyToJob } from "./actions";

const UUID = "3b241101-e2bb-4255-8caf-4136c566a962";
const form = (f: Record<string, string>) => {
  const fd = new FormData();
  Object.entries(f).forEach(([k, v]) => fd.set(k, v));
  return fd;
};

beforeEach(() => {
  vi.clearAllMocks();
  requireRole.mockResolvedValue({ id: 7, role: "applicant" });
});

describe("applyToJob", () => {
  it("blocks non-applicants before touching the database", async () => {
    requireRole.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(applyToJob({}, form({ public_id: UUID }))).rejects.toThrow("FORBIDDEN");
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects an invalid public id", async () => {
    const r = await applyToJob({}, form({ public_id: "not-a-uuid" }));
    expect(r.error).toMatch(/invalid/i);
    expect(query).not.toHaveBeenCalled();
  });

  it("reports a missing posting", async () => {
    query.mockResolvedValueOnce([[]]);
    const r = await applyToJob({}, form({ public_id: UUID }));
    expect(r.error).toMatch(/no longer exists/i);
  });

  it("refuses closed postings and does not insert", async () => {
    query.mockResolvedValueOnce([[{ id: 1, is_open: 0 }]]);
    const r = await applyToJob({}, form({ public_id: UUID }));
    expect(r.error).toMatch(/closed/i);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("turns a duplicate application into a friendly error", async () => {
    query
      .mockResolvedValueOnce([[{ id: 1, is_open: 1 }]])
      .mockRejectedValueOnce({ code: "ER_DUP_ENTRY" });
    const r = await applyToJob({}, form({ public_id: UUID }));
    expect(r.error).toMatch(/already applied/i);
  });

  it("inserts using the session user, ignoring any applicant_id in the form", async () => {
    query
      .mockResolvedValueOnce([[{ id: 42, is_open: 1 }]])
      .mockResolvedValueOnce([{}]);
    await expect(
      applyToJob({}, form({ public_id: UUID, applicant_id: "999" }))
    ).rejects.toThrow("REDIRECT:/applications");
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining("INSERT INTO submitted_applications"), [7, 42]);
  });
});