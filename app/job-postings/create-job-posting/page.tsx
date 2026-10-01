"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createApplication, type FormState } from "./actions";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR"];
const jobLength = ["Contract", "Salary"];

const inputClass =
  "mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "block text-sm font-medium text-gray-700";

export default function NewApplicationPage() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createApplication,
    {}
  );
  const v = state.values ?? {};

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Create Job Posting</h1>

      <form
        action={formAction}
        className="space-y-5 rounded-lg border bg-white p-6 shadow-sm"
      >
        {state.error && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <div>
          <label htmlFor="job_description" className={labelClass}>
            Job description{" "}
            <span className="required">*</span>
          </label>
          <textarea
            id="job_description"
            name="job_description"
            rows={5}
            required
            defaultValue={v.job_description}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="location" className={labelClass}>
            Location{" "}
            <span className="required">*</span>
          </label>
          <input
            id="location"
            name="location"
            type="text"
            maxLength={150}
            required
            placeholder="e.g. Remote, or New York, NY"
            defaultValue={v.location}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="job-title" className={labelClass}>
            Job Title{" "}
            <span className="required">*</span>
          </label>
          <input
            id="job-title"
            name="job-title"
            type="text"
            maxLength={150}
            required
            placeholder="e.g. Software Engineer"
            defaultValue={v.softwareengineer}
            className={inputClass}
          />
        </div>  
        
        <div>
          <label htmlFor="availability" className={labelClass}>
            Availability{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="availability"
            name="availability"
            type="text"
            maxLength={150}
            placeholder="How soon do you want the candidate to start after receiving the job?"
            defaultValue={v.immediately}
            className={inputClass}
          />
        </div>  
        
        <div>
            <label htmlFor="job-length" className={labelClass}>
              Contract or salaried?
            <span className="required">*</span>
            </label>
            <select
              id="job-length"
              name="job-length"
              required
              defaultValue={v.salaried}
              className={inputClass}
            >
              {jobLength.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="currency" className={labelClass}>
              Currency{" "}
            <span className="required">*</span>
            </label>
            <select
              id="currency"
              name="currency"
              required
              defaultValue={v.currency ?? "USD"}
              className={inputClass}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="minimum_pay" className={labelClass}>
              Minimum pay{" "}
            <span className="required">*</span>
            </label>
            <input
              id="minimum_pay"
              name="minimum_pay"
              type="number"
              min="0"
              step="100"
              required
              defaultValue={v.minimum_pay}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="maximum_pay" className={labelClass}>
              Maximum pay{" "}
            <span className="required">*</span>
            </label>
            <input
              id="maximum_pay"
              name="maximum_pay"
              type="number"
              min="0"
              step="100"
              required
              defaultValue={v.maximum_pay}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="date_closed" className={labelClass}>
              Date closed{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="date_closed"
              name="date_closed"
              type="date"
              defaultValue={v.date_closed}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? "Saving..." : "Create job posting"}
          </button>
          <Link
            href="/dashboard/applications"
            className="text-sm text-gray-600 hover:underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}