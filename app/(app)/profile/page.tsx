import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/app/lib/db";
import { requireRole } from "@/app/lib/auth";
import { VIEW_PROFILE, SUMMARY_ROLES, PROFILE_PICTURE_ROLES, ROLE_LABELS } from "@/app/lib/roles";
import { SummaryForm, PictureForm, ExperienceForm, EducationForm } from "./profile-forms";
import { deleteExperience, deleteEducation, removePicture } from "./actions";

export const dynamic = "force-dynamic";

const monthYear = (d: Date | string) =>
  new Date(d).toLocaleDateString(undefined, { month: "short", year: "numeric" });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function ProfilePage() {
  const me = await requireRole(VIEW_PROFILE);
  const role = me.role;

  const [userRows] = await pool.query<RowDataPacket[]>(
    "SELECT first_name, last_name, email, summary FROM users WHERE id = ?",
    [me.id]
  );
  const u = userRows[0];

  // ---- Company (recruiter, manager, company admin) ----
  let companies: RowDataPacket[] = [];
  if (role === "recruiter" || role === "hiring_manager") {
    [companies] = await pool.query<RowDataPacket[]>(
      `SELECT c.id, c.name, c.description FROM company c
       JOIN company_members cm ON cm.company_id = c.id WHERE cm.user_id = ?`,
      [me.id]
    );
  } else if (role === "company_admin") {
    [companies] = await pool.query<RowDataPacket[]>(
      `SELECT c.id, c.name, c.description FROM company c
       JOIN company_admins ca ON ca.company_id = c.id WHERE ca.user_id = ?`,
      [me.id]
    );
  }

  // ---- Manager: recruiters and postings at their company ----
  let recruiters: RowDataPacket[] = [];
  let postings: RowDataPacket[] = [];
  if (role === "hiring_manager" && companies.length > 0) {
    const ids = companies.map((c) => c.id);
    [recruiters] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.first_name, u.last_name, u.email
       FROM users u JOIN company_members cm ON cm.user_id = u.id
       WHERE cm.company_id IN (?) AND u.user_sub_group = 'recruiter'
       ORDER BY u.last_name`,
      [ids]
    );
    [postings] = await pool.query<RowDataPacket[]>(
      `SELECT public_id, job_title, location,
              (date_closed IS NULL OR date_closed >= CURDATE()) AS is_open
       FROM job_postings WHERE company_id IN (?) ORDER BY date_posted DESC`,
      [ids]
    );
  }

  // ---- Applicant: summary, picture, experience, education ----
  let summary: string | null = u.summary;
  let pictureVersion: number | null = null;
  let experience: RowDataPacket[] = [];
  let education: RowDataPacket[] = [];
  if (role === "applicant") {
    const [a] = await pool.query<RowDataPacket[]>(
      "SELECT summary FROM applicants WHERE user_id = ?", [me.id]
    );
    summary = a[0]?.summary ?? null;

    const [pic] = await pool.query<RowDataPacket[]>(
      "SELECT UNIX_TIMESTAMP(updated_at) AS v FROM profile_pictures WHERE user_id = ?", [me.id]
    );
    pictureVersion = pic[0] ? Number(pic[0].v) : null;

    [experience] = await pool.query<RowDataPacket[]>(
      `SELECT id, job_title, company_name, start_date, end_date, description
       FROM work_experience WHERE user_id = ?
       ORDER BY COALESCE(end_date, '9999-12-31') DESC, start_date DESC`,
      [me.id]
    );
    [education] = await pool.query<RowDataPacket[]>(
      `SELECT id, institution, degree, field_of_study, start_year, end_year
       FROM education WHERE user_id = ?
       ORDER BY COALESCE(end_year, 9999) DESC, start_year DESC`,
      [me.id]
    );
  }

  const hasPicture = PROFILE_PICTURE_ROLES.includes(role);
  const hasSummary = SUMMARY_ROLES.includes(role);
  const initials = `${u.first_name[0] ?? ""}${u.last_name[0] ?? ""}`.toUpperCase();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      {/* Identity */}
      <Section title="Profile">
        <div className="flex items-start gap-5">
          {hasPicture && (
            pictureVersion ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/avatar/${me.id}?v=${pictureVersion}`}
                alt={`${u.first_name} ${u.last_name}`}
                className="h-24 w-24 rounded-full border object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 text-2xl font-semibold text-gray-600">
                {initials}
              </div>
            )
          )}
          <div>
            <p className="text-xl font-semibold">{u.first_name} {u.last_name}</p>
            <span className="mt-1 inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {ROLE_LABELS[role]}
            </span>
            <p className="mt-2 text-sm text-gray-500">{u.email}</p>
            <Link href="/settings" className="text-sm text-blue-600 hover:underline">
              Edit name, email, or password in Settings
            </Link>
          </div>
        </div>

        {hasPicture && (
          <div className="mt-5 space-y-2 border-t pt-4">
            <PictureForm />
            {pictureVersion && (
              <form action={removePicture}>
                <button className="text-sm text-red-600 hover:underline">Remove picture</button>
              </form>
            )}
          </div>
        )}
      </Section>

      {/* Summary */}
      {hasSummary && (
        <Section title="About">
          <p className="whitespace-pre-line text-sm text-gray-700">
            {summary || "No summary yet."}
          </p>
          <SummaryForm initial={summary ?? ""} />
        </Section>
      )}

      {/* Company: recruiter, manager, company admin */}
      {["recruiter", "hiring_manager", "company_admin"].includes(role) && (
        <Section title={role === "company_admin" ? "Companies you administer" : "Company"}>
          {companies.length === 0 ? (
            <p className="text-sm text-gray-500">
              {role === "company_admin"
                ? "You don't administer a company yet."
                : "Your account isn't linked to a company yet."}
            </p>
          ) : (
            <ul className="space-y-4 text-sm">
              {companies.map((c) => (
                <li key={c.id}>
                  <p className="font-medium">{c.name}</p>
                  <p className="whitespace-pre-line text-gray-600">
                    {c.description || "No company description."}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {/* Manager responsibilities */}
      {role === "hiring_manager" && companies.length > 0 && (
        <>
          <Section title="Recruiters">
            {recruiters.length === 0 ? (
              <p className="text-sm text-gray-500">No recruiters at your company yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {recruiters.map((r) => (
                  <li key={r.id} className="py-2">
                    <span className="font-medium">{r.first_name} {r.last_name}</span>
                    <span className="text-gray-500"> · {r.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Job postings">
            {postings.length === 0 ? (
              <p className="text-sm text-gray-500">No job postings yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {postings.map((p) => (
                  <li key={p.public_id} className="flex items-center justify-between py-2">
                    <span>
                      <span className="font-medium">{p.job_title}</span>
                      <span className="text-gray-500"> · {p.location} · </span>
                      <span className={Number(p.is_open) === 1 ? "text-green-700" : "text-gray-500"}>
                        {Number(p.is_open) === 1 ? "Open" : "Closed"}
                      </span>
                    </span>
                    <Link href={`/job-postings/${p.public_id}/applications`}
                      className="text-blue-600 hover:underline">
                      Applicants
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}

      {/* Applicant: experience and education */}
      {role === "applicant" && (
        <>
          <Section title="Work experience">
            {experience.length === 0 ? (
              <p className="text-sm text-gray-500">No work experience added yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {experience.map((x) => (
                  <li key={x.id} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <p className="font-medium">{x.job_title} · {x.company_name}</p>
                      <p className="text-gray-500">
                        {monthYear(x.start_date)} – {x.end_date ? monthYear(x.end_date) : "Present"}
                      </p>
                      {x.description && (
                        <p className="mt-1 whitespace-pre-line text-gray-700">{x.description}</p>
                      )}
                    </div>
                    <form action={deleteExperience}>
                      <input type="hidden" name="id" value={x.id} />
                      <button className="text-xs text-red-600 hover:underline">Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <ExperienceForm />
          </Section>

          <Section title="Education">
            {education.length === 0 ? (
              <p className="text-sm text-gray-500">No education added yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {education.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <p className="font-medium">{e.institution}</p>
                      <p className="text-gray-700">
                        {[e.degree, e.field_of_study].filter(Boolean).join(", ") || "—"}
                      </p>
                      {(e.start_year || e.end_year) && (
                        <p className="text-gray-500">
                          {e.start_year ?? "?"} – {e.end_year ?? "Present"}
                        </p>
                      )}
                    </div>
                    <form action={deleteEducation}>
                      <input type="hidden" name="id" value={e.id} />
                      <button className="text-xs text-red-600 hover:underline">Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <EducationForm />
          </Section>
        </>
      )}
    </div>
  );
}