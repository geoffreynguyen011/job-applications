import { logout } from "@/app/login/actions";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
      >
        Log out
      </button>
    </form>
  );
}