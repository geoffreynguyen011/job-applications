"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  updateAccount, changePassword, updateApplicantProfile, type SettingsState,
} from "./actions";

const input = "mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm";
const label = "block text-sm font-medium text-gray-700";

function Section({
  title, description, state, pending, footer, children,
}: {
  title: string; description: string; state: SettingsState; pending: boolean;
  footer?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-sm text-gray-500">{description}</p>
      {state.error && <p className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="mb-3 rounded bg-green-50 p-3 text-sm text-green-700">{state.success}</p>}
      <div className="space-y-4">{children}</div>
      {footer ?? (
        <button type="submit" disabled={pending}
          className="mt-5 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {pending ? "Saving..." : "Save changes"}
        </button>
      )}
    </section>
  );
}

export function AccountForm({ first, last, email }: { first: string; last: string; email: string }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateAccount, {});
  const [editing, setEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Lock the form again after a successful save
  useEffect(() => {
    if (state.success) setEditing(false);
  }, [state]);

  function cancel() {
    formRef.current?.reset(); // restore the saved values
    setEditing(false);
  }

  const footer = editing ? (
    <div className="mt-5 flex gap-3">
      <button type="submit" disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {pending ? "Saving..." : "Save changes"}
      </button>
      <button type="button" onClick={cancel} disabled={pending}
        className="rounded border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        Cancel
      </button>
    </div>
  ) : (
    <button type="button" onClick={() => setEditing(true)}
      className="mt-5 rounded border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
      Edit account
    </button>
  );

  return (
    // key remounts the form with the newly saved values after an update
    <form ref={formRef} key={`${first}|${last}|${email}`} action={action}>
      <Section title="Account" description="Your name and sign-in email."
        state={state} pending={pending} footer={footer}>
        <fieldset disabled={!editing} className="space-y-4 disabled:opacity-70">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="first_name">First name</label>
              <input id="first_name" name="first_name" defaultValue={first} required
                className={`${input} disabled:bg-gray-100 disabled:text-gray-600`} /></div>
            <div><label className={label} htmlFor="last_name">Last name</label>
              <input id="last_name" name="last_name" defaultValue={last} required
                className={`${input} disabled:bg-gray-100 disabled:text-gray-600`} /></div>
          </div>
          <div><label className={label} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" defaultValue={email} required
              className={`${input} disabled:bg-gray-100 disabled:text-gray-600`} /></div>
        </fieldset>

        {editing && (
          <div>
            <label className={label} htmlFor="account_current_password">
              Current password{" "}
              <span className="font-normal text-gray-400">(only needed to change your email)</span>
            </label>
            <input id="account_current_password" name="current_password" type="password"
              autoComplete="current-password" className={input} />
          </div>
        )}
      </Section>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<SettingsState, FormData>(changePassword, {});
  return (
    <form action={action}>
      <Section title="Password" description="Use at least 8 characters." state={state} pending={pending}>
        <div><label className={label} htmlFor="current_password">Current password</label>
          <input id="current_password" name="current_password" type="password" required autoComplete="current-password" className={input} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={label} htmlFor="new_password">New password</label>
            <input id="new_password" name="new_password" type="password" required autoComplete="new-password" className={input} /></div>
          <div><label className={label} htmlFor="confirm_password">Confirm new password</label>
            <input id="confirm_password" name="confirm_password" type="password" required autoComplete="new-password" className={input} /></div>
        </div>
      </Section>
    </form>
  );
}