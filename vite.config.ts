import { defineConfig, loadEnv, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { encryptMailCredentials } from "./scripts/mail-credentials.mjs";

/**
 * Bakes this invitation's recipient into the site as an encrypted token (VITE_MAIL_CREDENTIALS), made from SMTP_TO
 * and MAIL_ENCRYPTION_KEY in .env. Only the token is bundled; the key stays here, and the account the mail is sent
 * from lives on the mail server, so no password is involved on this side at all. api/send-mail.php decrypts it with
 * the same key (see EMAIL.md). Without a key, no token is sent and the script falls back to its own .env.
 */
function mailCredentials(): Plugin {
  return {
    name: "mail-credentials",
    config(_, { mode }) {
      const env = loadEnv(mode, import.meta.dirname, "");
      let token = "";
      if (env["MAIL_ENCRYPTION_KEY"]) {
        try {
          token = encryptMailCredentials(env);
        } catch (e) {
          throw new Error(`[mail-credentials] ${(e as Error).message} in .env`);
        }
      } else {
        console.warn(
          "[mail-credentials] no MAIL_ENCRYPTION_KEY in .env: the mail API will use its own .env SMTP settings.",
        );
      }
      return { define: { "import.meta.env.VITE_MAIL_CREDENTIALS": JSON.stringify(token) } };
    },
  };
}

export default defineConfig(({ mode }) => ({
  // Where the site is served from: "/" for a domain of its own, or "/<repo>/" for a GitHub Pages project site
  // (https://<user>.github.io/<repo>/). Set with SITE_BASE in .env.production; every asset, link and the router
  // follow it.
  base: loadEnv(mode, import.meta.dirname, "")["SITE_BASE"] || "/",
  resolve: {
    alias: { "@": `${import.meta.dirname}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  plugins: [
    mailCredentials(),
    tailwindcss(),
    tanstackStart({
      // src/server.ts wraps the SSR handler with our error page
      server: { entry: "server" },
      // Render "/" to static HTML at build time so dist/client is a complete static site (Hostinger, any host).
      prerender: { enabled: true, crawlLinks: false },
    }),
    viteReact(),
  ],
}));
