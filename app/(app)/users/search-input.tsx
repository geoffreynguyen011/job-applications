"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function SearchInput() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; } // skip the initial render
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      router.replace(`/users?${next.toString()}`);
    }, 300); // wait 300ms after the last keystroke
    return () => clearTimeout(t);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <input id="q" name="q" type="search" value={value}
      onChange={(e) => setValue(e.target.value)} autoFocus
      placeholder="e.g. alice, or smith@example.com"
      className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm" />
  );
}