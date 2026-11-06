import type { Metadata, Viewport } from "next";
import "@fontsource-variable/schibsted-grotesk";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kanari — gaspillage alimentaire en restauration scolaire", template: "%s · Kanari" },
  description:
    "Kanari aide les cantines scolaires de Martinique à peser, comprendre et réduire leur gaspillage alimentaire, avec un pilote mesuré avant/après.",
};

export const viewport: Viewport = {
  themeColor: "#166534",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
