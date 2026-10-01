import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

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

  // Drop child tables first, then parents
  await connection.query("DROP TABLE IF EXISTS jobs_applied"); // leftover from the old schema
  await connection.query("DROP TABLE IF EXISTS submitted_applications");
  await connection.query("DROP TABLE IF EXISTS applications");
  await connection.query("DROP TABLE IF EXISTS job_postings");
  await connection.query("DROP TABLE IF EXISTS company");
  await connection.query("DROP TABLE IF EXISTS users");

  // ---------- Create tables ----------
  await connection.query(`
    CREATE TABLE users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      degree VARCHAR(100),
      field_of_study VARCHAR(100),
      university VARCHAR(150),
      location VARCHAR(150),
      summary TEXT
    )
  `);

  await connection.query(`
    CREATE TABLE company (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL UNIQUE
    )
  `);

  await connection.query(`
    CREATE TABLE job_postings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      job_description TEXT NOT NULL,
      job_title VARCHAR(150) NOT NULL,
      availability VARCHAR(50) NOT NULL,
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
      user_id INT NOT NULL,
      job_description_id INT NOT NULL,
      application_status ENUM('in_consideration', 'accepted', 'declined')
        NOT NULL DEFAULT 'in_consideration',
      date_applied DATE NOT NULL,
      PRIMARY KEY (user_id, job_description_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_description_id) REFERENCES job_postings(id)
        ON DELETE CASCADE
    )
  `);

  // ---------- Users (passwords hashed, never plain text) ----------
  const passwordHash = await bcrypt.hash("password123", 10);
  const users = [
    [
      "Alice", "Johnson", "alice@example.com", passwordHash,
      "BSc", "Computer Science", "UC Irvine", "Orange, CA",
      "Frontend developer with 3 years of React experience.",
    ],
    [
      "Bob", "Smith", "bob@example.com", passwordHash,
      "MSc", "Software Engineering", "Stanford University", "New York, NY",
      "Backend engineer focused on APIs and databases.",
    ],
    [
      "Carol", "Lee", "carol@example.com", passwordHash,
      "BA", "Information Systems", "University of London", "London, UK",
      "Full-stack developer who enjoys building internal tools.",
    ],
  ];
  await connection.query(
    `INSERT INTO users
      (first_name, last_name, email, password, degree,
       field_of_study, university, location, summary)
     VALUES ?`,
    [users]
  );

  // ---------- Companies ----------
  await connection.query("INSERT INTO company (name) VALUES ?", [
    [["Acme Corp"], ["Globex"], ["Initech"]],
  ]);

  // ---------- Look up real ids instead of assuming 1, 2, 3 ----------
  const [companyRows] = await connection.query<RowDataPacket[]>(
    "SELECT id, name FROM company"
  );
  const company = (name: string) => companyRows.find((c) => c.name === name)!.id;

  // ---------- Job postings ----------
  const postings = [
    [
      company("Acme Corp"),
      "Build and maintain customer-facing features with React and Next.js.",
      "Frontend Developer", "Full-time", "Permanent", "Remote",
      "USD", 90000, 120000, "2026-08-01", "2026-10-31",
    ],
    [
      company("Globex"),
      "Design Node.js APIs and MySQL schemas for our data platform.",
      "Backend Engineer", "Full-time", "Permanent", "New York, NY",
      "USD", 110000, 145000, "2026-08-15", "2026-10-15",
    ],
    [
      company("Initech"),
      "Build internal tooling across the stack for our operations team.",
      "Full-Stack Developer Intern", "Part-time", "6 months", "London, UK",
      "GBP", 25000, 32000, "2026-09-01", null,
    ],
  ];
  await connection.query(
    `INSERT INTO job_postings
      (company_id, job_description, job_title, availability, job_length,
       location, currency, minimum_pay, maximum_pay, date_posted, date_closed)
     VALUES ?`,
    [postings]
  );

  const [userRows] = await connection.query<RowDataPacket[]>(
    "SELECT id, email FROM users"
  );
  const [postingRows] = await connection.query<RowDataPacket[]>(
    "SELECT id, company_id, job_title FROM job_postings"
  );

  const userId = (email: string) => userRows.find((u) => u.email === email)!.id;
  const postingId = (title: string) =>
    postingRows.find((p) => p.job_title === title)!.id;

  // ---------- Applications (one per posting, company taken from the posting) ----------
  const applications = postingRows.map((p) => [p.company_id, p.id]);
  await connection.query(
    "INSERT INTO applications (company_id, job_posting) VALUES ?",
    [applications]
  );

  // ---------- Submitted applications ----------
  const submitted = [
    [userId("alice@example.com"), postingId("Frontend Developer"), "in_consideration", "2026-08-05"],
    [userId("alice@example.com"), postingId("Backend Engineer"), "declined", "2026-08-20"],
    [userId("bob@example.com"), postingId("Backend Engineer"), "accepted", "2026-08-22"],
    [userId("carol@example.com"), postingId("Full-Stack Developer Intern"), "in_consideration", "2026-09-05"],
  ];
  await connection.query(
    `INSERT INTO submitted_applications
      (user_id, job_description_id, application_status, date_applied)
     VALUES ?`,
    [submitted]
  );

  console.log("Seeding complete.");
  await connection.end();
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});