import { describe, it, expect, vi, beforeEach } from "vitest";

const { getSession, query, redirect, forbidden } = vi.hoisted(() => ({
  getSession: vi.fn(),
  query: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  forbidden: vi.fn(() => {
    throw new Error("FORBIDDEN");
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/app/lib/session", () => ({ getSession }));
vi.mock("@/app/lib/db", () => ({ pool: { query } }));
vi.mock("next/navigation", () => ({ redirect, forbidden }));

import {
  getCompanyAdminUserId,
  requireRole,
  getUserCompanyId,
  canManageCompany,
} from "./auth";

describe("getUserCompanyId", () => {
  it("returns the company id when linked", async () => {
    query.mockResolvedValue([[{ company_id: 4 }]]);
    expect(await getUserCompanyId(7)).toBe(4);
  });

  it("returns null when the user has no company", async () => {
    query.mockResolvedValue([[]]);
    expect(await getUserCompanyId(7)).toBeNull();
  });
});

describe("canManageCompany", () => {
  it("is true when a membership row exists", async () => {
    query.mockResolvedValue([[{ 1: 1 }]]);
    expect(await canManageCompany(7, 4)).toBe(true);
  });

  it("is false when there is no row", async () => {
    query.mockResolvedValue([[]]);
    expect(await canManageCompany(7, 4)).toBe(false);
  });
});