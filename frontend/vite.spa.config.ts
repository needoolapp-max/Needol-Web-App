import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
      routeTreeFileFooter: [
        "import type { getRouter } from './router.tsx'",
        "import type { startInstance } from './start.ts'",
        "declare module '@tanstack/react-start' {",
        "  interface Register {",
        "    ssr: true",
        "    router: Awaited<ReturnType<typeof getRouter>>",
        "    config: Awaited<ReturnType<typeof startInstance.getOptions>>",
        "  }",
        "}",
      ],
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Phase 10-2 — keep framer-motion out of the main bundle. The hero
        // is the only above-the-fold consumer and is already lazy-loaded;
        // AnimatedStatusBadge + FreelancerProfileCard pull in motion but
        // are below the fold, so all framer-motion ships in its own chunk.
        manualChunks: {
          "framer-motion": ["framer-motion"],
        },
      },
    },
  },
});
