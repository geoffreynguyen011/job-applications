import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="mx-auto mt-24 max-w-md text-center">
      <h1 className="mb-2 text-4xl font-bold">403</h1>
      <p className="mb-6 text-gray-600">
        You don't have permission to view this page.
      </p>
      <Link href="/dashboard" className="text-blue-600 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}