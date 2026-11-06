// Version démo autonome (un seul fichier HTML) pour un hébergement statique.
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const root = import.meta.dirname;

export default defineConfig({
  root,
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: [
      { find: "next/navigation", replacement: path.resolve(root, "shims/next-navigation.ts") },
      { find: "next/link", replacement: path.resolve(root, "shims/next-link.tsx") },
      { find: "@", replacement: path.resolve(root, "../src") },
    ],
  },
  define: {
    "process.env.NEXT_PUBLIC_SUPABASE_URL": "undefined",
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": "undefined",
  },
  build: { outDir: path.resolve(root, "dist"), emptyOutDir: true, assetsInlineLimit: 100_000_000 },
});
