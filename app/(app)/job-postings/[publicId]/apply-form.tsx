"use client";

import { useActionState } from "react";
import { applyToJob, type ApplyState } from "./actions";

export default function ApplyForm({ publicId }: { publicId: string }) {
  const [state, formAction, pending] = useActionState<ApplyState, FormData>(
    applyToJob,
    {}
  );

  return (
    <form action={formAction} className="mt-8">
      <input type="hidden" name="public_id" value={publicId} />
      {state.error && (
        <p className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Submitting..." : "Apply now"}
      </button>
    </form>
  );
}