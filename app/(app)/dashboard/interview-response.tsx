"use client";

import { useState } from "react";
import { respondToInterview } from "./actions";

export default function InterviewResponse({ interviewId }: { interviewId: number }) {
  const [choice, setChoice] = useState<"accepted" | "declined" | null>(null);

  // Step 1: choose
  if (!choice) {
    return (
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setChoice("accepted")}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => setChoice("declined")}
          className="rounded border bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Decline
        </button>
      </div>
    );
  }

  // Step 2: confirm
  const accepting = choice === "accepted";
  return (
    <form
      action={respondToInterview}
      className={`mt-3 rounded border p-3 text-sm ${
        accepting ? "border-blue-200 bg-white" : "border-red-200 bg-white"
      }`}
    >
      <input type="hidden" name="interview_id" value={interviewId} />
      <input type="hidden" name="response" value={choice} />

      <p className="text-gray-800">
        {accepting
          ? "Confirm that you want to accept this interview?"
          : "Confirm that you want to decline this interview? You won't be able to change this here."}
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className={`rounded px-3 py-1.5 text-xs font-medium text-white ${
            accepting ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          Confirm {accepting ? "accept" : "decline"}
        </button>
        <button
          type="button"
          onClick={() => setChoice(null)}
          className="rounded border bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Go back
        </button>
      </div>
    </form>
  );
}