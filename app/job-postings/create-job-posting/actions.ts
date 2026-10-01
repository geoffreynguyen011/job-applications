"use server";

import { pool } from "@/app/lib/db";
import { redirect } from "next/navigation";

export type FormState = {
  error?: string;
  values?: Record<string, string>;
};

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR"];

export async function createApplication(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const get = (key: string) => String(formData.get(key) ?? "").trim();

  const values = {
    company_name: get("company_name"),
    job_description: get("job_description"),
    location: get("location"),
    currency: get("currency"),
    minimum_pay: get("minimum_pay"),
    maximum_pay: get("maximum_pay"),
    date_posted: get("date_posted"),
    date_closed: get("date_closed"),
  };

  // --- Validation ---
  if (!values.company_name || !values.job_description || !values.location) {
    return { error: "Company, description, and location are required.", values };
  }
  if (!CURRENCIES.includes(values.currency)) {
    return { error: "Please choose a valid currency.", values };
  }

  const min = Number(values.minimum_pay);
  const max = Number(values.maximum_pay);
  if (!values.minimum_pay || !values.maximum_pay || isNaN(min) || isNaN(max)) {
    return { error: "Minimum and maximum pay must be numbers.", values };
  }
  if (min < 0 || max < min) {
    return { error: "Maximum pay must be greater than or equal to minimum pay.", values };
  }

  if (!values.date_posted) {
    return { error: "Date posted is required.", values };
  }
  if (values.date_closed && values.date_closed < values.date_posted) {
    return { error: "Date closed can't be before the date posted.", values };
  }

  // --- Insert ---
  try {
    await pool.query(
      `INSERT INTO job_postings
        (company_name, job_description, location, job_title, availability, job_length, 
        currency, minimum_pay, maximum_pay, date_posted, date_closed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        values.company_name,
        values.job_description,
        values.location,
        // values.job_title,
        // values.availability || null,
        // values.job_length,
        values.currency,
        min,
        max,
        values.date_posted,
        values.date_closed || null, // optional, stored as NULL if empty
      ]
    );
  } catch (err) {
    console.error(err);
    return { error: "Something went wrong saving the application.", values };
  }

  // redirect() must be called outside try/catch
  redirect("/dashboard/applications");
}