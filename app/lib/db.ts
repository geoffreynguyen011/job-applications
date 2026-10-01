import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

const globalForDb = globalThis as unknown as { pool?: mysql.Pool };

export const pool =
  globalForDb.pool ??
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      ca: fs.readFileSync(path.join(process.cwd(), "ca.pem")),
    },
    waitForConnections: true,
    connectionLimit: 5,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;