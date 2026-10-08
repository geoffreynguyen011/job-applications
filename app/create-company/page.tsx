"use client";
import { useActionState } from "react";

export default function CreateCompanyPage() {
    const [state, formAction, pending] = useActionState<FormState, FormData>(
        createJobPosting,
    {}
    );
    const v = state.values ?? {};
    return (
        <div className="container">
            <h1 className="mb-6 text-2xl font-bold">Create New Company</h1>

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
                <label htmlFor="job_description">
                Job description{" "}
                <span className="required">*</span>
                </label>
                <textarea
                id="job_description"
                name="job_description"
                rows={5}
                required
                defaultValue={company}
                />
            </div>
            </form>
        </div> 
    )
}