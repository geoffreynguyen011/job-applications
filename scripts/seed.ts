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
  await connection.query("DROP TABLE IF EXISTS jobs_applied");
  await connection.query("DROP TABLE IF EXISTS applications");
  await connection.query("DROP TABLE IF EXISTS users");

  await connection.query(`
    CREATE TABLE users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_name VARCHAR(150) NOT NULL,
      job_description TEXT NOT NULL,
      location VARCHAR(150) NOT NULL,
      currency CHAR(3) NOT NULL,
      minimum_pay DECIMAL(12, 2) NOT NULL,
      maximum_pay DECIMAL(12, 2) NOT NULL,
      date_posted DATE NOT NULL,
      date_closed DATE NULL
    )
  `);

  await connection.query(`
    CREATE TABLE jobs_applied (
      user_id INT NOT NULL,
      job_description_id INT NOT NULL,
      application_status ENUM('in_consideration', 'accepted', 'declined')
        NOT NULL DEFAULT 'in_consideration',
      date_applied DATE NOT NULL,
      PRIMARY KEY (user_id, job_description_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_description_id) REFERENCES applications(id) ON DELETE CASCADE
    )
  `);

  // --- Users (passwords are hashed, never store plain text) ---
  const passwordHash = await bcrypt.hash("password123", 10);
  const users = [
    ["Alice", "Johnson", passwordHash, "alice@example.com"],
    ["Bob", "Smith", passwordHash, "bob@example.com"],
    ["Carol", "Lee", passwordHash, "carol@example.com"],
  ];
  await connection.query(
    "INSERT INTO users (first_name, last_name, password, email) VALUES ?",
    [users]
  );

  // --- Applications (job postings) ---
  const jobs = [
    [
      "Acme Corp",
      "Frontend developer working with React and Next.js.",
      "Remote",
      "USD",
      90000,
      120000,
      "2026-08-01",
      "2026-10-01",
    ],
    [
      "Globex",
      "Backend engineer building Node.js APIs and MySQL schemas.",
      "New York, NY",
      "USD",
      110000,
      145000,
      "2026-08-15",
      "2026-10-15",
    ],
    [
      "Initech",
      "Full-stack developer for internal tooling.",
      "London, UK",
      "GBP",
      65000,
      85000,
      "2026-09-01",
      null,
    ],
  ];
  await connection.query(
    `INSERT INTO applications
      (company_name, job_description, location, currency,
       minimum_pay, maximum_pay, date_posted, date_closed)
     VALUES ?`,
    [jobs]
  );

  // --- Jobs applied (look up real ids rather than assuming 1, 2, 3) ---
  const [userRows] = await connection.query<RowDataPacket[]>(
    "SELECT id, first_name, last_name, email FROM users"
  );
  const [jobRows] = await connection.query<RowDataPacket[]>(
    "SELECT id, company_name FROM applications"
  );

  const user = (email: string) => userRows.find((u) => u.email === email)!;
  const job = (company: string) => jobRows.find((j) => j.company_name === company)!;

  const build = (
    email: string,
    company: string,
    status: "in_consideration" | "accepted" | "declined",
    dateApplied: string
  ) => {
    const u = user(email);
    return [u.id, job(company).id, status, dateApplied];
  };

  const jobsApplied = [
    build("alice@example.com", "Acme Corp", "in_consideration", "2026-08-05"),
    build("alice@example.com", "Globex", "declined", "2026-08-20"),
    build("bob@example.com", "Globex", "accepted", "2026-08-22"),
    build("carol@example.com", "Initech", "in_consideration", "2026-09-05"),
  ];

  await connection.query(
    `INSERT INTO jobs_applied
      (user_id, job_description_id,
       application_status, date_applied)
     VALUES ?`,
    [jobsApplied]
  );

  console.log("Seeding complete.");
  await connection.end();
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});