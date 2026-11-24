import { describe, it, expect } from "vitest";
import { buildTitleFilter } from "./job-search";

describe("buildTitleFilter", () => {
  it("returns null for empty input", () => {
    expect(buildTitleFilter("")).toBeNull();
    expect(buildTitleFilter("   ")).toBeNull();
  });

  it("returns null when only stop words are given", () => {
    expect(buildTitleFilter("the job for a")).toBeNull();
  });

  it("expands related words", () => {
    const f = buildTitleFilter("software engineer")!;
    expect(f.params).toContain("%developer%");
    expect(f.params).toContain("%frontend%");
    expect(f.params).toContain("%engineer%");
  });

  it("treats words from the same cluster as one group", () => {
    const f = buildTitleFilter("engineer developer")!;
    // one group => one OR-block, not two
    expect(f.where.match(/\) OR \(/g)).toBeNull();
  });

  it("uses a placeholder for every param (no values in the SQL text)", () => {
    const f = buildTitleFilter("data analyst'; DROP TABLE users;--")!;
    expect(f.where).not.toMatch(/DROP/i);
    expect(f.where.match(/\?/g)!.length).toBe(f.params.length);
  });

  it("caps the number of search words at 6", () => {
    const f = buildTitleFilter("aa bb cc dd ee ff gg hh ii jj")!;
    expect(f.params).toHaveLength(6);
  });

  it("includes a score expression for ranking", () => {
    const f = buildTitleFilter("software engineer")!;
    expect(f.score).toContain("CASE WHEN");
  });
});