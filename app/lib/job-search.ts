const STOP_WORDS = new Set(["a", "an", "and", "the", "of", "for", "in", "at", "to", "job", "jobs"]);

// Words in the same cluster are treated as related. Edit freely.
const CLUSTERS: string[][] = [
  ["engineer", "engineers", "engineering", "developer", "programmer", "swe"],
  ["software", "full-stack", "fullstack", "front-end", "frontend", "back-end", "backend", "web"],
  ["designer", "design", "ux", "ui"],
  ["analyst", "analytics", "data"],
  ["manager", "lead", "head"],
  ["intern", "internship", "trainee", "graduate"],
];

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

export function buildTitleFilter(input: string): { where: string; score: string; params: string[] } | null {
  const tokens = input
    .toLowerCase()
    .split(/[^a-z0-9+#-]+/)
    .filter((t) => t && !STOP_WORDS.has(t))
    .slice(0, 6);
  if (tokens.length === 0) return null;

  // One group of related terms per search word (duplicates collapse)
  const groups = new Map<string, string[]>();
  for (const t of tokens) {
    const terms = CLUSTERS.find((c) => c.includes(t)) ?? [t];
    groups.set(terms.join("|"), terms);
  }

  const conds: string[] = [];
  const params: string[] = [];
  for (const terms of groups.values()) {
    conds.push("(" + terms.map(() => "jp.job_title LIKE ?").join(" OR ") + ")");
    params.push(...terms.map((t) => `%${escapeLike(t)}%`));
  }

  return {
    where: "(" + conds.join(" OR ") + ")", // matches ANY group
    score: conds.map((c) => `(CASE WHEN ${c} THEN 1 ELSE 0 END)`).join(" + "), // more groups = higher rank
    params, // used once in WHERE and once in ORDER BY
  };
}