"use server";

import { pool } from "@/app/lib/db";
import { redirect } from "next/navigation";

export type FormState = {
  error?: string;
  values?: Record<string, string>;
};

export async function createCompany(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const get = (key: string) => String(formData.get(key) ?? "").trim();
    const values = {
        company_name: get("name")
    }

  // --- Validation ---
  if (!values.company_name) {
    return { error: "Please provide a company name.", values };
  }

  // --- Insert ---
  try {
    // INSERT COMPANY NAME LATER
    await pool.query(
      `INSERT INTO company 
        (name)
       VALUES (?)`,
      [
        values.company_name
      ]
    );
  } catch (err) {
    console.error(err);
    return { error: "Something went wrong with saving the name.", values };
  }

  // redirect() must be called outside try/catch
  redirect("/");
}