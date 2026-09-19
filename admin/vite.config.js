import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const enableReactCompiler =
  process.env.REACT_COMPILER !== "0" && process.env.REACT_COMPILER !== "false";
const allowedHosts = (process.env.VITE_ALLOWED_HOSTS || "localhost,127.0.0.1")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

// The CSP's connect-src must include wherever the API actually lives, not
// just the hardcoded rentalpropertymanager.com domain - derive it from VITE_API_URL
// so this works on any deployment (Railway, etc.) without editing this file.
const apiOrigin = (() => {
  try {
    return new URL(process.env.VITE_API_URL).origin;
  } catch {
    return null;
  }
})();

const contentSecurityPolicy =
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline'; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  `img-src 'self' data: blob: http://localhost:3000 https://api.dicebear.com https://d3jxmneabzth3l.cloudfront.net https://d2om00vm7sdvbc.cloudfront.net${apiOrigin ? ` ${apiOrigin}` : ""}; ` +
  "font-src 'self' data: https://fonts.gstatic.com; " +
  `connect-src 'self' http://localhost:* ws://localhost:* https://api.rentalpropertymanager.com${apiOrigin ? ` ${apiOrigin}` : ""}; ` +
  "frame-src 'self' https://www.google.com https://maps.google.com;; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self';";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: enableReactCompiler
          ? [["babel-plugin-react-compiler", { target: "19" }]]
          : [],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": contentSecurityPolicy,
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": contentSecurityPolicy,
    },
  },
});
