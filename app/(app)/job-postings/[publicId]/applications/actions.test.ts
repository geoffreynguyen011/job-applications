import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireRole, canManageCompany, query } = vi.hoisted(() => ({
  requireRole: vi.fn(),
  canManageCompany: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({ requireRole, canManageCompany }));
vi.mock("@/app/lib/db", () => ({ pool: { query } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { scheduleInterview } from "./actions";

const UUID = "3b241101-e2bb-4255-8caf-4136c566a962";
const future = () => new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 16);

const valid = () => ({
  public_id: UUID, applicant_id: "5", scheduled_at: future(),
  duration_minutes: "30", format: "video", location: "https://meet.example.com/x", notes: "",
});
const form = (f: Record<string, string>) => {
  const fd = new FormData();
  Object.entries(f).forEach(([k, v]) => fd.set(k, v));
  return fd;
};

beforeEach(() => {
  vi.clearAllMocks();
  requireRole.mockResolvedValue({ id: 2, role: "recruiter" });
  canManageCompany.mockResolvedValue(true);
});

describe("scheduleInterview", () => {
  it("rejects a time in the past", async () => {
    const r = await scheduleInterview({}, form({ ...valid(), scheduled_at: "2020-01-01T10:00" }));
    expect(r.error).toMatch(/future/i);
    expect(query).not.toHaveBeenCalled();
  });

  it("requires a link or address unless the format is phone", async () => {
    const r = await scheduleInterview({}, form({ ...valid(), location: "" }));
    expect(r.error).toMatch(/link or address/i);
  });

  it("accepts a phone interview with no location", async () => {
    query
      .mockResolvedValueOnce([[{ id: 1, company_id: 3 }]]) // job
      .mockResolvedValueOnce([[{ 1: 1 }]])                 // applied
      .mockResolvedValueOnce([[]])                         // no clash
      .mockResolvedValueOnce([{}]);                        // insert
    const r = await scheduleInterview({}, form({ ...valid(), format: "phone", location: "" }));
    expect(r.success).toMatch(/scheduled/i);
  });

  it("rejects invalid durations", async () => {
    const r = await scheduleInterview({}, form({ ...valid(), duration_minutes: "7" }));
    expect(r.error).toMatch(/invalid/i);
  });

  it("blocks recruiters from another company", async () => {
    query.mockResolvedValueOnce([[{ id: 1, company_id: 3 }]]);
    canManageCompany.mockResolvedValue(false);
    const r = await scheduleInterview({}, form(valid()));
    expect(r.error).toMatch(/can't schedule/i);
    expect(query).toHaveBeenCalledTimes(1); // never reached the insert
  });

  it("rejects someone who never applied", async () => {
    query
      .mockResolvedValueOnce([[{ id: 1, company_id: 3 }]])
      .mockResolvedValueOnce([[]]);
    const r = await scheduleInterview({}, form(valid()));
    expect(r.error).toMatch(/hasn't applied/i);
  });

  it("prevents double-booking the same time", async () => {
    query
      .mockResolvedValueOnce([[{ id: 1, company_id: 3 }]])
      .mockResolvedValueOnce([[{ 1: 1 }]])
      .mockResolvedValueOnce([[{ 1: 1 }]]); // clash found
    const r = await scheduleInterview({}, form(valid()));
    expect(r.error).toMatch(/already has an interview/i);
  });

  it("inserts with the session user as scheduler", async () => {
    query
      .mockResolvedValueOnce([[{ id: 1, company_id: 3 }]])
      .mockResolvedValueOnce([[{ 1: 1 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{}]);
    await scheduleInterview({}, form(valid()));
    const [sql, params] = query.mock.calls.at(-1)!;
    expect(sql).toContain("INSERT INTO interviews");
    expect(params[0]).toBe(5);  // applicant
    expect(params[1]).toBe(1);  // job id from the database
    expect(params[2]).toBe(2);  // scheduled_by = session user
  });
});