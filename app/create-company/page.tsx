"use client";
import { useActionState } from "react";
import { createCompany } from "./actions";
import { FormState } from "./actions";
import Link from "next/link";

export default function CreateCompanyPage() {
    const [state, formAction, pending] = useActionState<FormState, FormData>(
        createCompany,
    {}
    );
    const v = state.values ?? {};
    return (
        <div className="container">
            <h1 className="mb-6 text-2xl font-bold">Create New Company</h1>
            <form
            action={formAction}
            className="space-y-5 rounded-lg border bg-white shadow-sm"
            >
            {state.error && (
                <p className="rounded bg-red-50 p-3 text-sm text-red-700">
                {state.error}
                </p>
            )}

                <div>
                    <label htmlFor="name">
                    Company name{" "}
                    <span className="required">*</span>
                    </label>
                    <div>
                        <textarea
                        id="name"
                        name="name"
                        rows={5}
                        required
                        defaultValue={v.name}
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
                    href="/dashboard/JobPostings"
                    className="text-sm text-gray-600 hover:underline"
                >
                    Cancel
                </Link>
                </div>
                
            </form>
        </div> 
    )
}