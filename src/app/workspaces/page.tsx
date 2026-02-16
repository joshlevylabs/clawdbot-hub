"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WorkspacesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/org-chart");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-sm text-slate-500">Redirecting to Org Chart...</p>
    </div>
  );
}
