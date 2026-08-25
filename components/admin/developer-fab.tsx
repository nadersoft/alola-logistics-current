"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { DeveloperContactWidget } from "./developer-contact-widget";

const HIDDEN_ROLES = ["CLIENT", "SUPPORT", "USER"];

export function DeveloperFab() {
  const { data: session } = useSession();
  const role = ((session?.user as Record<string, unknown>)?.role as string || "").toUpperCase();
  if (HIDDEN_ROLES.includes(role)) return null;
  if (role && !["ADMIN", "MANAGER", "OWNER", "SUPER_ADMIN"].includes(role)) return null;
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
        title="Developer Support"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-80">
          <DeveloperContactWidget />
        </div>
      )}
    </>
  );
}
