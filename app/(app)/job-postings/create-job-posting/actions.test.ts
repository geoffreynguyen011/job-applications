import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireRole, getUserCompanyId, query, redirect } = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getUserCompanyId: vi.fn(),
  query: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));

vi.mock("@/app/lib/auth", () => ({ requireRole, getUserCompanyId }));
vi.mock("@/app/lib/db", () => ({ pool: { query } }));
vi.mock("next/navigation", () => ({ redirect }));

import { createJobPosting } from "./actions";

const valid = () => ({
  job_description: "Build things", job_title: "Engineer", location: "Remote",
  currency: "USD", availability: "Full-time", job_length: "Salary",
  minimum_pay: "50000", maximum_pay: "70000", date_closed: "",
});
const form = (f: Record<string, string>) => {
  const fd = new FormData();
  Object.entries(f).forEach(([k, v]) => fd.set(k, v));
  return fd;
};

beforeEach(() => {
  vi.clearAllMocks();
  requireRole.mockResolvedValue({ id: 2, role: "recruiter" });
  getUserCompanyId.mockResolvedValue(9);
});

describe("createJobPosting", () => {
  it("errors when the account has no company", async () => {
    getUserCompanyId.mockResolvedValue(null);
    const r = await createJobPosting({}, form(valid()));
    expect(r.error).toMatch(/isn't linked to a company/i);
    expect(query).not.toHaveBeenCalled();
  });

  it("requires title, description, and location", async () => {
    const r = await createJobPosting({}, form({ ...valid(), job_title: "" }));
    expect(r.error).toMatch(/required/i);
  });

  it("rejects unknown currencies", async () => {
    const r = await createJobPosting({}, form({ ...valid(), currency: "XXX" }));
    expect(r.error).toMatch(/currency/i);
  });

  it("rejects maximum pay below minimum pay", async () => {
    const r = await createJobPosting({}, form({ ...valid(), minimum_pay: "80000", maximum_pay: "60000" }));
    expect(r.error).toMatch(/greater than or equal/i);
  });

  it("rejects non-numeric pay", async () => {
    const r = await createJobPosting({}, form({ ...valid(), minimum_pay: "abc" }));
    expect(r.error).toMatch(/numbers/i);
  });

  it("rejects a closing date in the past", async () => {
    const r = await createJobPosting({}, form({ ...valid(), date_closed: "2020-01-01" }));
    expect(r.error).toMatch(/date closed/i);
  });

  it("uses the company from the user's account, not the form", async () => {
    query.mockResolvedValue([{}]);
    await expect(
      createJobPosting({}, form({ ...valid(), company_id: "1" }))
    ).rejects.toThrow("REDIRECT:/job-postings");

    const [, params] = query.mock.calls[0];
    expect(params[0]).toMatch(/^[0-9a-f-]{36}$/); // generated public_id
    expect(params[1]).toBe(9);                    // company from getUserCompanyId
    expect(params).toHaveLength(12);
  });

  it("returns a friendly error if the insert fails", async () => {
    query.mockRejectedValue(new Error("boom"));
    const r = await createJobPosting({}, form(valid()));
    expect(r.error).toMatch(/something went wrong/i);
  });
});