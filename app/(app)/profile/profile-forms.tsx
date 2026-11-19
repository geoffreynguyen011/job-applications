"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  updateSummary, uploadPicture, addExperience, addEducation, type ProfileState,
} from "./actions";

const input = "mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm";
const label = "block text-sm font-medium text-gray-700";
const button =
  "rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50";

function Message({ state }: { state: ProfileState }) {
  return (
    <>
      {state.error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="rounded bg-green-50 p-3 text-sm text-green-700">{state.success}</p>}
    </>
  );
}

// Clears the fields after a successful save
function useResetOnSuccess(state: ProfileState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state]);
  return ref;
}

export function SummaryForm({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateSummary, {});
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-medium text-blue-600">Edit summary</summary>
      <form action={action} className="mt-3 space-y-3">
        <Message state={state} />
        <textarea name="summary" rows={5} maxLength={2000} defaultValue={initial} className={input} />
        <button disabled={pending} className={button}>{pending ? "Saving..." : "Save"}</button>
      </form>
    </details>
  );
}

export function PictureForm() {
  const [state, action, pending] = useActionState<ProfileState, FormData>(uploadPicture, {});
  return (
    <form action={action} className="space-y-2">
      <Message state={state} />
      <input
        type="file" name="picture" accept="image/png,image/jpeg,image/webp" required
        className="block text-sm file:mr-3 file:rounded file:border file:bg-white file:px-3 file:py-1.5 file:text-sm"
      />
      <p className="text-xs text-gray-500">JPEG, PNG, or WebP, up to 1 MB.</p>
      <button disabled={pending} className={button}>{pending ? "Uploading..." : "Upload picture"}</button>
    </form>
  );
}

export function ExperienceForm() {
  const [state, action, pending] = useActionState<ProfileState, FormData>(addExperience, {});
  const ref = useResetOnSuccess(state);
  return (
    <details className="mt-4 rounded border bg-gray-50 p-4">
      <summary className="cursor-pointer text-sm font-medium text-blue-600">Add work experience</summary>
      <form ref={ref} action={action} className="mt-4 space-y-4">
        <Message state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={label} htmlFor="job_title">Job title</label>
            <input id="job_title" name="job_title" required maxLength={150} className={input} /></div>
          <div><label className={label} htmlFor="company_name">Company</label>
            <input id="company_name" name="company_name" required maxLength={150} className={input} /></div>
          <div><label className={label} htmlFor="start_date">Start date</label>
            <input id="start_date" name="start_date" type="date" required className={input} /></div>
          <div><label className={label} htmlFor="end_date">
            End date <span className="font-normal text-gray-400">(blank if current)</span></label>
            <input id="end_date" name="end_date" type="date" className={input} /></div>
        </div>
        <div><label className={label} htmlFor="description">
          Description <span className="font-normal text-gray-400">(optional)</span></label>
          <textarea id="description" name="description" rows={3} maxLength={2000} className={input} /></div>
        <button disabled={pending} className={button}>{pending ? "Saving..." : "Add experience"}</button>
      </form>
    </details>
  );
}

export function EducationForm() {
  const [state, action, pending] = useActionState<ProfileState, FormData>(addEducation, {});
  const ref = useResetOnSuccess(state);
  return (
    <details className="mt-4 rounded border bg-gray-50 p-4">
      <summary className="cursor-pointer text-sm font-medium text-blue-600">Add education</summary>
      <form ref={ref} action={action} className="mt-4 space-y-4">
        <Message state={state} />
        <div><label className={label} htmlFor="institution">Institution</label>
          <input id="institution" name="institution" required maxLength={150} className={input} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={label} htmlFor="edu_degree">Degree</label>
            <input id="edu_degree" name="degree" maxLength={100} className={input} /></div>
          <div><label className={label} htmlFor="edu_field">Field of study</label>
            <input id="edu_field" name="field_of_study" maxLength={100} className={input} /></div>
          <div><label className={label} htmlFor="start_year">Start year</label>
            <input id="start_year" name="start_year" type="number" min="1950" max="2100" className={input} /></div>
          <div><label className={label} htmlFor="end_year">End year</label>
            <input id="end_year" name="end_year" type="number" min="1950" max="2100" className={input} /></div>
        </div>
        <button disabled={pending} className={button}>{pending ? "Saving..." : "Add education"}</button>
      </form>
    </details>
  );
}