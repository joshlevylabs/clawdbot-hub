"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useHubStore } from "@/lib/store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const initialize = useHubStore((state) => state.initialize);
  const loading = useHubStore((state) => state.loading);
  const initialized = useHubStore((state) => state.initialized);

  // Skip initialization on login page
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!isLoginPage) {
      initialize();
    }
  }, [initialize, isLoginPage]);

  // Don't show loading state on login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!initialized && loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
