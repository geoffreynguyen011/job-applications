import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireRole, query } = vi.hoisted(() => ({ requireRole: vi.fn(), query: vi.fn() }));

vi.mock("@/app/lib/auth", () => ({ requireRole }));
vi.mock("@/app/lib/db", () => ({ pool: { query } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { uploadPicture, addExperience, addEducation } from "./actions";

const withFile = (bytes: number[] | Uint8Array, name = "pic.png") => {
  const fd = new FormData();
  fd.set("picture", new File([new Uint8Array(bytes)], name, { type: "image/png" }));
  return fd;
};
const form = (f: Record<string, string>) => {
  const fd = new FormData();
  Object.entries(f).forEach(([k, v]) => fd.set(k, v));
  return fd;
};

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0];

beforeEach(() => {
  vi.clearAllMocks();
  requireRole.mockResolvedValue({ id: 7, role: "applicant" });
  query.mockResolvedValue([{}]);
});

describe("uploadPicture", () => {
  it("accepts a real PNG", async () => {
    const r = await uploadPicture({}, withFile(PNG));
    expect(r.success).toBeTruthy();
    expect(query.mock.calls[0][1][1]).toBe("image/png");
  });

  it("accepts a real JPEG", async () => {
    await uploadPicture({}, withFile(JPEG, "a.jpg"));
    expect(query.mock.calls[0][1][1]).toBe("image/jpeg");
  });

  it("rejects a text file renamed to .png", async () => {
    const r = await uploadPicture({}, withFile([...Buffer.from("hello world, not an image")]));
    expect(r.error).toMatch(/jpeg, png, or webp/i);
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects files over 1 MB", async () => {
    const big = new Uint8Array(1024 * 1024 + 1);
    big.set(PNG);
    const r = await uploadPicture({}, withFile(big));
    expect(r.error).toMatch(/1 MB/);
  });

  it("rejects an empty submission", async () => {
    const r = await uploadPicture({}, new FormData());
    expect(r.error).toMatch(/choose an image/i);
  });
});

describe("addExperience", () => {
  const ok = { job_title: "Dev", company_name: "Acme", start_date: "2020-01-01", end_date: "", description: "" };

  it("requires title and company", async () => {
    const r = await addExperience({}, form({ ...ok, job_title: "" }));
    expect(r.error).toMatch(/required/i);
  });

  it("rejects an end date before the start date", async () => {
    const r = await addExperience({}, form({ ...ok, end_date: "2019-01-01" }));
    expect(r.error).toMatch(/end date/i);
  });

  it("stores a current job with a NULL end date", async () => {
    await addExperience({}, form(ok));
    expect(query.mock.calls[0][1][4]).toBeNull();
  });
});

describe("addEducation", () => {
  it("requires an institution", async () => {
    const r = await addEducation({}, form({ institution: "" }));
    expect(r.error).toMatch(/institution/i);
  });

  it("rejects out-of-range years", async () => {
    const r = await addEducation({}, form({ institution: "MIT", start_year: "1800" }));
    expect(r.error).toMatch(/1950/);
  });

  it("rejects an end year before the start year", async () => {
    const r = await addEducation({}, form({ institution: "MIT", start_year: "2020", end_year: "2018" }));
    expect(r.error).toMatch(/end year/i);
  });
});