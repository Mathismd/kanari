"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { SessionProvider } from "@/components/session";
import { ToastProvider } from "@/components/ui";

export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const toLogin = useCallback(() => router.replace("/connexion"), [router]);
  return (
    <ToastProvider>
      <SessionProvider onAnonymous={toLogin}>
        <AppShell>{children}</AppShell>
      </SessionProvider>
    </ToastProvider>
  );
}
