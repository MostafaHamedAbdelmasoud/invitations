import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
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
        console.warn("[mail-credentials] no MAIL_ENCRYPTION_KEY in .env: the mail API will use its own .env SMTP settings.");
      }
      return { define: { "import.meta.env.VITE_MAIL_CREDENTIALS": JSON.stringify(token) } };
    },
  };
}

/**
 * Dev only: runs api/send-mail.php with PHP's built-in server on a free port and forwards /send-mail.php to it, so
 * RSVPs and wishes really send from `npm run dev`, as they will from the hosted API. The script reads .env.server
 * when it exists (the server's own .env: MAIL_ENCRYPTION_KEY + ALLOWED_ORIGINS), otherwise the project's .env.
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
      // .env.server, if there is one, is the script's own .env (key + allowed sites only), like the VPS's
      const serverEnv = `${import.meta.dirname}/.env.server`;
      const php = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", "api"], {
        stdio: "ignore",
        env: existsSync(serverEnv) ? { ...process.env, MAIL_ENV_FILE: serverEnv } : process.env,
      });
      php.on("error", () => server.config.logger.warn("[php-mail-dev] PHP isn't installed, so RSVPs and wishes can't be emailed from the dev server."));
      const stop = () => php.kill();
      server.httpServer?.on("close", stop);
      process.once("exit", stop);

      server.middlewares.use("/send-mail.php", (req, res) => {
        const upstream = request({ host: "127.0.0.1", port, path: "/send-mail.php", method: req.method, headers: req.headers }, (phpRes) => {
          res.writeHead(phpRes.statusCode ?? 502, phpRes.headers);
          phpRes.pipe(res);
        });
        upstream.on("error", () => {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "php" }));
        });
        req.pipe(upstream);
      });
    },
  };
}

export default defineConfig({
  resolve: {
    alias: { "@": `${import.meta.dirname}/src` },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
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
});
