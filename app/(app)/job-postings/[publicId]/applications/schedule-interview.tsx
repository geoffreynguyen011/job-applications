"use client";

import { useActionState } from "react";
import { scheduleInterview, type InterviewState } from "./actions";

const input = "mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm";
const label = "block text-sm font-medium text-gray-700";

export default function ScheduleInterview({
  publicId,
  applicantId,
}: {
  publicId: string;
  applicantId: number;
}) {
  const [state, action, pending] = useActionState<InterviewState, FormData>(
    scheduleInterview,
    {}
  );

  return (
    <details className="mt-4 rounded border bg-gray-50 p-4">
      <summary className="cursor-pointer text-sm font-medium text-blue-600">
        Schedule interview
      </summary>

      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="public_id" value={publicId} />
        <input type="hidden" name="applicant_id" value={applicantId} />

        {state.error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
        {state.success && <p className="rounded bg-green-50 p-3 text-sm text-green-700">{state.success}</p>}

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor={`at-${applicantId}`}>Date and time</label>
            <input id={`at-${applicantId}`} name="scheduled_at" type="datetime-local" required className={input} />
          </div>
          <div>
            <label className={label} htmlFor={`dur-${applicantId}`}>Duration</label>
            <select id={`dur-${applicantId}`} name="duration_minutes" defaultValue="30" className={input}>
              {[15, 30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor={`fmt-${applicantId}`}>Format</label>
            <select id={`fmt-${applicantId}`} name="format" defaultValue="video" className={input}>
              <option value="video">Video call</option>
              <option value="phone">Phone</option>
              <option value="onsite">On site</option>
            </select>
          </div>
        </div>

        <div>
          <label className={label} htmlFor={`loc-${applicantId}`}>
            Meeting link or address <span className="font-normal text-gray-400">(not needed for phone)</span>
          </label>
          <input id={`loc-${applicantId}`} name="location" maxLength={255} className={input} />
        </div>

        <div>
          <label className={label} htmlFor={`notes-${applicantId}`}>
            Notes for the applicant <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea id={`notes-${applicantId}`} name="notes" rows={3} maxLength={2000} className={input} />
        </div>

        <button type="submit" disabled={pending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {pending ? "Scheduling..." : "Schedule"}
        </button>
      </form>
    </details>
  );
}