"use server";

import { pool } from "@/app/lib/db";
import { redirect } from "next/navigation";

export type FormState = {
  error?: string;
  values?: Record<string, string>;
};

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR"];

export async function createJobPosting(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const get = (key: string) => String(formData.get(key) ?? "").trim();

  const values = {
    company_id: "2", // change value later
    job_description: get("job_description"),
    job_title: get("job_title"),
    location: get("location"),
    currency: get("currency"),
    availability: get("availability"),
    job_length: get("job_length"),
    minimum_pay: get("minimum_pay"),
    maximum_pay: get("maximum_pay"),
    date_closed: get("date_closed"),
  };

  // --- Validation ---
  if (!values.job_description || !values.location || !values.job_title) {
    return { error: "Job title, description, and location are required.", values };
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
  const date = new Date().toJSON().slice(0, 10);
  if (values.date_closed && values.date_closed < date) {
    return { error: "Date closed can't be before the date posted.", values };
  }

  // --- Insert ---
  try {
    // INSERT COMPANY NAME LATER
    await pool.query(
      `INSERT INTO job_postings 
        (company_id, job_description, job_title, location, availability, job_length, 
        currency, minimum_pay, maximum_pay, date_posted, date_closed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        values.company_id,
        values.job_description,
        values.job_title,
        values.location,
        values.availability || null,
        values.job_length,
        values.currency,
        min,
        max,
        date,
        values.date_closed || null, // optional, stored as NULL if empty
      ]
    );
  } catch (err) {
    console.error(err);
    return { error: "Something went wrong with saving the job posting.", values };
  }

  // redirect() must be called outside try/catch
  redirect("/job-postings");
}