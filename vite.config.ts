import { spawn } from "node:child_process";
import { request } from "node:http";
import { createServer } from "node:net";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { encryptMailCredentials } from "./scripts/mail-credentials.mjs";

/**
 * Bakes this invitation's whole mail setup into the site as an encrypted token (VITE_MAIL_CREDENTIALS), made from
 * SMTP_HOST / PORT / SECURE / USER / PASS / FROM / TO and MAIL_ENCRYPTION_KEY in .env. Only the token is bundled; the
 * key and the password stay here. api/send-mail.php decrypts it with the same key (see EMAIL.md). Without a key, no
 * token is sent and the script uses the SMTP_* values in its own .env, as before.
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

/**
 * Dev only: runs api/send-mail.php with PHP's built-in server on a free port and forwards /send-mail.php to it, so
 * RSVPs and wishes really send from `npm run dev`, as they will from the hosted API. The script reads its own
 * api/.env (MAIL_ENCRYPTION_KEY + ALLOWED_ORIGINS), never this project's .env, just as on its server.
 */
function phpMailDev(): Plugin {
  return {
    name: "php-mail-dev",
    apply: "serve",
    async configureServer(server) {
      const port = await new Promise<number>((resolve) => {
        const probe = createServer().listen(0, "127.0.0.1", () => {
          const { port } = probe.address() as { port: number };
          probe.close(() => resolve(port));
        });
      });
      // send-mail.php as the router: every request runs the script, so files beside it (its .env) are never served
      const php = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", "api", "api/send-mail.php"], {
        stdio: "ignore",
      });
      php.on("error", () =>
        server.config.logger.warn(
          "[php-mail-dev] PHP isn't installed, so RSVPs and wishes can't be emailed from the dev server.",
        ),
      );
      const stop = () => php.kill();
      server.httpServer?.on("close", stop);
      process.once("exit", stop);

      server.middlewares.use("/send-mail.php", (req, res) => {
        const upstream = request(
          {
            host: "127.0.0.1",
            port,
            path: "/send-mail.php",
            method: req.method,
            headers: req.headers,
          },
          (phpRes) => {
            res.writeHead(phpRes.statusCode ?? 502, phpRes.headers);
            phpRes.pipe(res);
          },
        );
        upstream.on("error", () => {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "php" }));
        });
        req.pipe(upstream);
      });
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
    phpMailDev(),
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
