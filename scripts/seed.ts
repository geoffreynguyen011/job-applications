import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ---------- Helpers ----------
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
};
const addDays = (s: string, n: number) => {
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
};

type Cell = string | number | null;

// ---------- Source data ----------
const COMPANY_NAMES = [
  "Acme Corp", "Globex", "Initech", "Umbrella Labs", "Hooli", "Stark Logistics",
  "Wayne Analytics", "Wonka Foods", "Cyberdyne Systems", "Soylent Health",
  "Vandelay Industries", "Pied Piper", "Aperture Science", "Tyrell Robotics",
  "Massive Dynamic", "Oscorp Biotech", "Gringotts Finance", "Dunder Mifflin",
  "Bluth Properties", "Prestige Worldwide", "Monarch Energy", "Nakatomi Trading",
  "Rekall Travel", "Sterling Cooper", "Black Mesa Research",
];
const EMPLOYEE_COUNTS = ["Less than 50", "50-200", "200-500", "500+"];

const FIRST = ["Liam", "Olivia", "Noah", "Emma", "Oliver", "Ava", "Elijah", "Sophia", "James", "Isabella",
  "Lucas", "Mia", "Mason", "Amelia", "Ethan", "Harper", "Logan", "Evelyn", "Aiden", "Zoe"];
const LAST = ["Nguyen", "Garcia", "Kim", "Patel", "Brown", "Martinez", "Khan", "Rossi", "Cohen", "Silva",
  "Tanaka", "Okafor", "Murphy", "Novak", "Haddad", "Larsen", "Dubois", "Reyes", "Ivanov", "Chen"];

const DEGREES = ["BSc", "MSc", "BA", "MBA", "PhD"];
const FIELDS = ["Computer Science", "Data Science", "Information Systems", "Design", "Mathematics", "Electrical Engineering"];
const UNIS = ["UC Irvine", "Stanford University", "University of London", "MIT", "University of Toronto", "TU Munich", "NYU"];
const LOCS = ["Orange, CA", "New York, NY", "London, UK", "Austin, TX", "Toronto, ON", "Remote", "Seattle, WA"];

const TITLES = [
  "Data Analyst", "Product Designer", "DevOps Engineer", "QA Engineer", "Mobile Developer",
  "Machine Learning Engineer", "Technical Writer", "Security Analyst", "Project Manager",
  "Site Reliability Engineer", "Support Engineer", "UX Researcher", "Cloud Architect",
  "Data Engineer", "Business Analyst", "iOS Developer", "Android Developer", "Platform Engineer",
  "Solutions Architect", "Software Engineer", "Systems Administrator", "Marketing Analyst",
];
const CURRENCIES = ["USD", "USD", "GBP", "EUR", "CAD"];
const STATUSES = ["in_consideration", "in_consideration", "accepted", "declined"] as const;

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { ca: fs.readFileSync(path.join(process.cwd(), "ca.pem")) },
  });

  console.log("Seeding database...");

  // ---------- Drop everything (checks off so leftover tables can't block it) ----------
  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const t of [
    "education", "work_experience", "profile_pictures", "interviews",
    "jobs_applied", "submitted_applications", "applications", "job_postings",
    "company_members", "company_admins", "company_admin_requests",
    "applicants", "company", "users",
  ]) {
    await connection.query(`DROP TABLE IF EXISTS ${t}`);
  }
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");

  // ---------- Create tables (parents before children) ----------
  await connection.query(`
    CREATE TABLE users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      summary TEXT NULL,
      user_sub_group ENUM('admin', 'company_admin', 'recruiter', 'hiring_manager', 'applicant')
        NOT NULL DEFAULT 'applicant',
      date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE applicants (
      user_id INT PRIMARY KEY,
      degree VARCHAR(100),
      field_of_study VARCHAR(100),
      university VARCHAR(150),
      location VARCHAR(150),
      summary TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await connection.query(`
    CREATE TABLE company (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL UNIQUE,
      employee_count VARCHAR(100) NULL,
      description VARCHAR(500) NULL
    )
  `);

  await connection.query(`
    CREATE TABLE company_admins (
      user_id INT NOT NULL,
      company_id INT NOT NULL,
      PRIMARY KEY (user_id, company_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
    )
  `);

  await connection.query(`
    CREATE TABLE company_members (
      user_id INT PRIMARY KEY,
      company_id INT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
    )
  `);

  await connection.query(`
    CREATE TABLE job_postings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      public_id CHAR(36) NOT NULL UNIQUE,
      company_id INT NOT NULL,
      job_description TEXT NOT NULL,
      job_title VARCHAR(150) NOT NULL,
      availability VARCHAR(50) NULL,
      job_length VARCHAR(50) NOT NULL,
      location VARCHAR(150) NOT NULL,
      currency CHAR(3) NOT NULL,
      minimum_pay DECIMAL(12, 2) NOT NULL,
      maximum_pay DECIMAL(12, 2) NOT NULL,
      date_posted DATE NOT NULL,
      date_closed DATE NULL,
      FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
    )
  `);

  await connection.query(`
    CREATE TABLE applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      job_posting INT NOT NULL,
      FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
      FOREIGN KEY (job_posting) REFERENCES job_postings(id) ON DELETE CASCADE
    )
  `);

  await connection.query(`
    CREATE TABLE submitted_applications (
      applicant_id INT NOT NULL,
      job_description_id INT NOT NULL,
      application_status ENUM('in_consideration', 'accepted', 'declined')
        NOT NULL DEFAULT 'in_consideration',
      date_applied DATE NOT NULL,
      dismissed_notice ENUM('declined', 'closed') NULL,
      PRIMARY KEY (applicant_id, job_description_id),
      FOREIGN KEY (applicant_id) REFERENCES applicants(user_id) ON DELETE CASCADE,
      FOREIGN KEY (job_description_id) REFERENCES job_postings(id) ON DELETE CASCADE
    )
  `);

  await connection.query(`
    CREATE TABLE interviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      applicant_id INT NOT NULL,
      job_posting_id INT NOT NULL,
      scheduled_by INT NULL,
      scheduled_at DATETIME NOT NULL,
      duration_minutes INT NOT NULL DEFAULT 30,
      format ENUM('video', 'phone', 'onsite') NOT NULL DEFAULT 'video',
      location VARCHAR(255) NULL,
      notes TEXT NULL,
      status ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
      applicant_response ENUM('pending', 'accepted', 'declined') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (applicant_id, job_posting_id)
        REFERENCES submitted_applications(applicant_id, job_description_id)
        ON DELETE CASCADE,
      FOREIGN KEY (scheduled_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await connection.query(`
    CREATE TABLE profile_pictures (
      user_id INT PRIMARY KEY,
      content_type VARCHAR(50) NOT NULL,
      data MEDIUMBLOB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await connection.query(`
    CREATE TABLE work_experience (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      job_title VARCHAR(150) NOT NULL,
      company_name VARCHAR(150) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NULL,
      description TEXT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await connection.query(`
    CREATE TABLE education (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      institution VARCHAR(150) NOT NULL,
      degree VARCHAR(100) NULL,
      field_of_study VARCHAR(100) NULL,
      start_year SMALLINT NULL,
      end_year SMALLINT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // ---------- Companies (25) ----------
  const companyRows: Cell[][] = COMPANY_NAMES.map((name, i) => [
    name,
    EMPLOYEE_COUNTS[i % 4],
    `${name} builds products for customers across ${LOCS[i % LOCS.length]} and beyond.`,
  ]);
  await connection.query(
    "INSERT INTO company (name, employee_count, description) VALUES ?",
    [companyRows]
  );
  const [companyIdRows] = await connection.query<RowDataPacket[]>(
    "SELECT id FROM company ORDER BY id"
  );
  const companyIds: number[] = companyIdRows.map((r) => r.id); // index matches COMPANY_NAMES

  // ---------- Applicant info (25) ----------
  const applicantInfo = [
    { first: "Alice", last: "Johnson", email: "alice@example.com", degree: "BSc", field: "Computer Science",
      uni: "UC Irvine", loc: "Orange, CA", summary: "Frontend developer with 3 years of React experience." },
    { first: "Bob", last: "Smith", email: "bob@example.com", degree: "MSc", field: "Software Engineering",
      uni: "Stanford University", loc: "New York, NY", summary: "Backend engineer focused on APIs and databases." },
    { first: "Carol", last: "Lee", email: "carol@example.com", degree: "BA", field: "Information Systems",
      uni: "University of London", loc: "London, UK", summary: "Full-stack developer who enjoys building internal tools." },
  ];
  for (let k = 3; k < 25; k++) {
    const first = FIRST[k % FIRST.length];
    const last = LAST[(k * 3) % LAST.length];
    const field = FIELDS[k % FIELDS.length];
    applicantInfo.push({
      first, last,
      email: `${first}.${last}${k}@example.com`.toLowerCase(),
      degree: DEGREES[k % DEGREES.length],
      field,
      uni: UNIS[k % UNIS.length],
      loc: LOCS[k % LOCS.length],
      summary: `${field} graduate looking for a role where I can grow and contribute quickly.`,
    });
  }

  // ---------- Users: 1 admin + 25 recruiters + 25 managers + 25 company admins + 25 applicants ----------
  const passwordHash = await bcrypt.hash("password123", 10);

  const recruiterEmail = (ci: number) => (ci === 0 ? "recruiter@example.com" : `recruiter${ci + 1}@example.com`);
  const managerEmail = (ci: number) => (ci === 0 ? "manager@example.com" : `manager${ci + 1}@example.com`);
  const adminEmail = (ci: number) => (ci === 0 ? "companyadmin@example.com" : `companyadmin${ci + 1}@example.com`);

  const userRows: Cell[][] = [
    ["Dana", "Admin", "admin@example.com", passwordHash, null, "admin"],
  ];
  const named = [
    { f: "Ravi", l: "Patel" },   // Acme recruiter
    { f: "Maria", l: "Gomez" },  // Acme manager
    { f: "Erin", l: "Walsh" },   // Acme company admin
  ];
  for (let ci = 0; ci < 25; ci++) {
    const person = (offset: number, idx: number) => ({
      f: ci === 0 ? named[idx].f : FIRST[(ci * 7 + offset) % FIRST.length],
      l: ci === 0 ? named[idx].l : LAST[(ci * 5 + offset) % LAST.length],
    });
    const r = person(1, 0), m = person(2, 1), a = person(3, 2);
    const co = COMPANY_NAMES[ci];
    userRows.push(
      [r.f, r.l, recruiterEmail(ci), passwordHash, `Recruiter at ${co}.`, "recruiter"],
      [m.f, m.l, managerEmail(ci), passwordHash, `Hiring manager at ${co}.`, "hiring_manager"],
      [a.f, a.l, adminEmail(ci), passwordHash, `Administrator for ${co}.`, "company_admin"],
    );
  }
  for (const a of applicantInfo) {
    userRows.push([a.first, a.last, a.email, passwordHash, null, "applicant"]);
  }
  await connection.query(
    `INSERT INTO users (first_name, last_name, email, password, summary, user_sub_group)
     VALUES ?`,
    [userRows]
  );

  const [userIdRows] = await connection.query<RowDataPacket[]>("SELECT id, email FROM users");
  const userId = (email: string) => userIdRows.find((u) => u.email === email)!.id as number;
  const applicantIds = applicantInfo.map((a) => userId(a.email));

  // ---------- Applicant profiles (25) ----------
  await connection.query(
    `INSERT INTO applicants (user_id, degree, field_of_study, university, location, summary)
     VALUES ?`,
    [applicantInfo.map((a, k) => [applicantIds[k], a.degree, a.field, a.uni, a.loc, a.summary])]
  );

  // ---------- Company admins (25) and members: recruiters + managers (50) ----------
  await connection.query("INSERT INTO company_admins (user_id, company_id) VALUES ?", [
    companyIds.map((cid, ci) => [userId(adminEmail(ci)), cid]),
  ]);
  const memberRows: Cell[][] = [];
  companyIds.forEach((cid, ci) => {
    memberRows.push([userId(recruiterEmail(ci)), cid], [userId(managerEmail(ci)), cid]);
  });
  await connection.query("INSERT INTO company_members (user_id, company_id) VALUES ?", [memberRows]);

  // ---------- Job postings (25, one per company) ----------
  type Posting = {
    title: string; desc: string; avail: string; length: string; location: string;
    currency: string; min: number; max: number; posted: string; closed: string | null;
  };
  const postings: Posting[] = [
    { title: "Frontend Developer", desc: "Build and maintain customer-facing features with React and Next.js.",
      avail: "Full-time", length: "Permanent", location: "Remote", currency: "USD",
      min: 90000, max: 120000, posted: "2026-08-01", closed: "2026-10-31" },
    { title: "Backend Engineer", desc: "Design Node.js APIs and MySQL schemas for our data platform.",
      avail: "Full-time", length: "Permanent", location: "New York, NY", currency: "USD",
      min: 110000, max: 145000, posted: "2026-08-15", closed: "2026-10-15" },
    { title: "Full-Stack Developer Intern", desc: "Build internal tooling across the stack for our operations team.",
      avail: "Part-time", length: "6 months", location: "London, UK", currency: "GBP",
      min: 25000, max: 32000, posted: "2026-09-01", closed: null },
  ];
  for (let j = 3; j < 25; j++) {
    const title = TITLES[j - 3];
    const posted = daysFromNow(-(10 + j * 5));
    const min = 50000 + (j % 10) * 8000;
    postings.push({
      title,
      desc: `${COMPANY_NAMES[j]} is hiring a ${title}. You will work with a small team, own your projects, and ship improvements every week.`,
      avail: j % 3 === 0 ? "Part-time" : "Full-time",
      length: ["Permanent", "6 months", "12 months", "Permanent"][j % 4],
      location: LOCS[j % LOCS.length],
      currency: CURRENCIES[j % CURRENCIES.length],
      min,
      max: min + 25000,
      posted,
      // a third open-ended, a third open until later, a third already closed
      closed: j % 3 === 0 ? null : j % 3 === 1 ? daysFromNow(10 + j) : daysFromNow(-j),
    });
  }
  await connection.query(
    `INSERT INTO job_postings
      (public_id, company_id, job_description, job_title, availability, job_length,
       location, currency, minimum_pay, maximum_pay, date_posted, date_closed)
     VALUES ?`,
    [postings.map((p, j) => [
      randomUUID(), companyIds[j], p.desc, p.title, p.avail, p.length,
      p.location, p.currency, p.min, p.max, p.posted, p.closed,
    ])]
  );
  const [postingIdRows] = await connection.query<RowDataPacket[]>(
    "SELECT id, company_id FROM job_postings ORDER BY id"
  );
  const postingIds: number[] = postingIdRows.map((r) => r.id); // index j matches postings[j]

  // ---------- Applications (25, one per posting) ----------
  await connection.query("INSERT INTO applications (company_id, job_posting) VALUES ?", [
    postingIdRows.map((p) => [p.company_id, p.id]),
  ]);

  // ---------- Submitted applications (~60) ----------
  type App = { k: number; j: number; status: string; date: string };
  const apps: App[] = [];
  const seen = new Set<string>();
  const addApp = (k: number, j: number, status: string, date?: string) => {
    const key = `${k}-${j}`;
    if (seen.has(key)) return;
    seen.add(key);
    apps.push({ k, j, status, date: date ?? addDays(postings[j].posted, 1 + (k % 5)) });
  };

  // The original demo rows
  addApp(0, 0, "in_consideration", "2026-08-05");
  addApp(0, 1, "declined", "2026-08-20");
  addApp(1, 1, "accepted", "2026-08-22");
  addApp(2, 2, "in_consideration", "2026-09-05");
  // Alice gets 12 applications total, enough to test pagination (10 per page)
  for (let j = 2; j < 12; j++) addApp(0, j, STATUSES[j % 4]);
  // Everyone else applies to two postings
  for (let k = 1; k < 25; k++) {
    for (let t = 0; t < 2; t++) addApp(k, (k * 3 + t) % 25, STATUSES[(k + t) % 4]);
  }
  await connection.query(
    `INSERT INTO submitted_applications
      (applicant_id, job_description_id, application_status, date_applied)
     VALUES ?`,
    [apps.map((a) => [applicantIds[a.k], postingIds[a.j], a.status, a.date])]
  );

  // ---------- Interviews (25, only for applications that weren't declined) ----------
  const eligible = apps.filter((a) => a.status !== "declined");
  const chosen = eligible.filter((_, i) => i % 3 !== 2).slice(0, 25);

  const interviewRows: Cell[][] = chosen.map((a, i) => {
    const kind = ["video", "phone", "onsite"][i % 3];
    const location =
      kind === "video" ? `https://meet.example.com/room-${i + 1}`
      : kind === "onsite" ? `${100 + i} Market St, Suite ${i + 1}`
      : null;

    let status = "scheduled";
    let date = daysFromNow(1 + i);
    let response = ["pending", "accepted", "declined"][i % 3];
    if (i % 5 === 4) { status = "completed"; date = daysFromNow(-(3 + i)); response = "accepted"; }
    else if (i % 5 === 3) { status = "cancelled"; response = "pending"; }

    const time = `${String(9 + (i % 8)).padStart(2, "0")}:00:00`;
    return [
      applicantIds[a.k], postingIds[a.j], userId(recruiterEmail(a.j)), `${date} ${time}`,
      [30, 45, 60][i % 3], kind, location,
      i % 2 === 0 ? "Please have your resume handy." : null,
      status, response,
    ];
  });
  await connection.query(
    `INSERT INTO interviews
      (applicant_id, job_posting_id, scheduled_by, scheduled_at, duration_minutes,
       format, location, notes, status, applicant_response)
     VALUES ?`,
    [interviewRows]
  );

  // ---------- Work experience (25) and education (25), one each per applicant ----------
  await connection.query(
    `INSERT INTO work_experience
      (user_id, job_title, company_name, start_date, end_date, description)
     VALUES ?`,
    [applicantInfo.map((_, k) => {
      const year = 2014 + (k % 8);
      const month = String((k % 9) + 1).padStart(2, "0");
      return [
        applicantIds[k],
        TITLES[k % TITLES.length],
        COMPANY_NAMES[(k + 5) % COMPANY_NAMES.length],
        `${year}-${month}-01`,
        k % 4 === 0 ? null : `${year + 2}-${month}-28`, // null = current job
        "Delivered features, collaborated across teams, and mentored junior colleagues.",
      ];
    })]
  );
  await connection.query(
    `INSERT INTO education
      (user_id, institution, degree, field_of_study, start_year, end_year)
     VALUES ?`,
    [applicantInfo.map((a, k) => [
      applicantIds[k], a.uni, a.degree, a.field, 2008 + (k % 8), 2012 + (k % 8),
    ])]
  );

  console.log(
    `Seeded ${companyIds.length} companies, ${userRows.length} users ` +
    `(${applicantInfo.length} applicants), ${postings.length} job postings, ` +
    `${apps.length} submitted applications, ${interviewRows.length} interviews, ` +
    `${applicantInfo.length} work experience and ${applicantInfo.length} education entries.`
  );
  await connection.end();
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});