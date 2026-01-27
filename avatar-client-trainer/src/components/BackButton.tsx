"use client";

import { useRouter } from "next/navigation";

export function BackButton({ label = "Назад" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 rounded-full border border-purple-300 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50"
    >
      ← {label}
    </button>
  );
}
