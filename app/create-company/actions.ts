"use server";

import { pool } from "@/app/lib/db";
import { getCompanyAdminUserId } from "@/app/lib/auth";
import { redirect } from "next/navigation";

export type FormState = {
  error?: string;
  values?: Record<string, string>;
};

export async function createCompany(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const userId = await getCompanyAdminUserId();
  if (!userId) {
    return { error: "Only company administrators can create companies." };
  }

  const get = (key: string) => String(formData.get(key) ?? "").trim();
  const values = {
    name: get("name"),
    employee_count: get("employee_count"),
    company_description: get("company_description"),
  };

  if (!values.name) {
    return { error: "Please provide a company name.", values };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result]: any = await conn.query(
      `INSERT INTO company (name, employee_count, description) VALUES (?, ?, ?)`,
      [values.name, values.employee_count || null, values.company_description || null]
    );

    // The creator becomes this company's administrator
    await conn.query(
      "INSERT INTO company_admins (user_id, company_id) VALUES (?, ?)",
      [userId, result.insertId]
    );

    await conn.commit();
  } catch (err: any) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      return { error: "A company with that name already exists.", values };
    }
    console.error(err);
    return { error: "Something went wrong saving the company.", values };
  } finally {
    conn.release();
  }

  redirect("/dashboard");
}