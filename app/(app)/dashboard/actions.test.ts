import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireRole, query } = vi.hoisted(() => ({ requireRole: vi.fn(), query: vi.fn() }));

vi.mock("@/app/lib/auth", () => ({ requireRole }));
vi.mock("@/app/lib/db", () => ({ pool: { query } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { respondToInterview, dismissNotice } from "./actions";

const form = (f: Record<string, string>) => {
  const fd = new FormData();
  Object.entries(f).forEach(([k, v]) => fd.set(k, v));
  return fd;
};
const UUID = "3b241101-e2bb-4255-8caf-4136c566a962";

beforeEach(() => {
  vi.clearAllMocks();
  requireRole.mockResolvedValue({ id: 7, role: "applicant" });
});

describe("respondToInterview", () => {
  it("ignores values other than accepted/declined", async () => {
    await respondToInterview(form({ interview_id: "1", response: "pending" }));
    expect(query).not.toHaveBeenCalled();
  });

  it("ignores a non-numeric interview id", async () => {
    await respondToInterview(form({ interview_id: "abc", response: "accepted" }));
    expect(query).not.toHaveBeenCalled();
  });

  it("scopes the update to the logged-in applicant", async () => {
    query.mockResolvedValue([{}]);
    await respondToInterview(form({ interview_id: "12", response: "declined" }));
    expect(query.mock.calls[0][1]).toEqual(["declined", 12, 7]);
  });

  it("is blocked for non-applicants", async () => {
    requireRole.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(
      respondToInterview(form({ interview_id: "1", response: "accepted" }))
    ).rejects.toThrow("FORBIDDEN");
  });
});

describe("dismissNotice", () => {
  it("does nothing for accepted applications", async () => {
    query.mockResolvedValueOnce([[{ application_status: "accepted", job_id: 1, is_open: 1 }]]);
    await dismissNotice(form({ public_id: UUID }));
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("does nothing while a posting is open and under review", async () => {
    query.mockResolvedValueOnce([[{ application_status: "in_consideration", job_id: 1, is_open: 1 }]]);
    await dismissNotice(form({ public_id: UUID }));
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("dismisses a declined notice", async () => {
    query
      .mockResolvedValueOnce([[{ application_status: "declined", job_id: 4, is_open: 0 }]])
      .mockResolvedValueOnce([{}]);
    await dismissNotice(form({ public_id: UUID }));
    expect(query.mock.calls[1][1]).toEqual(["declined", 7, 4]);
  });

  it("dismisses a closed notice for an in-consideration application", async () => {
    query
      .mockResolvedValueOnce([[{ application_status: "in_consideration", job_id: 4, is_open: 0 }]])
      .mockResolvedValueOnce([{}]);
    await dismissNotice(form({ public_id: UUID }));
    expect(query.mock.calls[1][1][0]).toBe("closed");
  });
});