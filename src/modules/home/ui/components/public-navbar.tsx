"use client";

import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";

/**
 * Top bar shown to signed-out visitors on the public home page. Signed-in users
 * get the dashboard sidebar + navbar instead (see (dashboard)/layout.tsx).
 */
export const PublicNavbar = () => {
  return (
    <nav className="flex shrink-0 items-center justify-between border-b bg-background px-4 py-3 sm:px-6">
      <Link href="/" className="flex items-center gap-x-1">
        <Image src="/logo.svg" height={40} width={40} alt="Connex.AI" />
        <span className="text-xl font-semibold">Connex.AI</span>
      </Link>

      <div className="flex items-center gap-x-2 sm:gap-x-4">
        <Button asChild variant="ghost" className="font-medium">
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button
          asChild
          className="rounded-lg bg-indigo-600 font-semibold text-white hover:bg-indigo-700"
        >
          <Link href="/sign-up">Get Started</Link>
        </Button>
      </div>
    </nav>
  );
};
