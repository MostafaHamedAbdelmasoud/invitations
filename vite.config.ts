import { spawn } from "node:child_process";
import { request } from "node:http";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { encryptMailCredentials } from "./scripts/mail-credentials.mjs";
import { loadSiteConfig } from "./scripts/site-config.mjs";

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

/**
 * Dev only: runs send-mail.php with PHP's built-in server on a free port and forwards config.json's devEndpoint to
 * it, so RSVPs and wishes really send from `npm run dev` without touching the live API. The script is wherever
 * devApiDir points (the API is its own repo now); it reads that folder's own .env, never this project's, just as
 * it does on its server.
 */
function phpMailDev(apiDir: string, endpoint: string): Plugin {
  return {
    name: "php-mail-dev",
    apply: "serve",
    async configureServer(server) {
      if (!apiDir || !endpoint.startsWith("/")) return; // dev is pointed at a real host instead
      const dir = resolve(import.meta.dirname, apiDir);
      if (!existsSync(`${dir}/send-mail.php`)) {
        server.config.logger.warn(
          `[php-mail-dev] no send-mail.php in ${dir} ("devApiDir" in config.json), so RSVPs can't be emailed from the dev server.`,
        );
        return;
      }
      const port = await new Promise<number>((resolve) => {
        const probe = createServer().listen(0, "127.0.0.1", () => {
          const { port } = probe.address() as { port: number };
          probe.close(() => resolve(port));
        });
      });
      // send-mail.php as the router: every request runs the script, so files beside it (its .env) are never served
      const php = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", dir, `${dir}/send-mail.php`], {
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

      server.middlewares.use(endpoint, (req, res) => {
        const upstream = request(
          { host: "127.0.0.1", port, path: endpoint, method: req.method, headers: req.headers },
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

export default defineConfig(({ mode }) => {
  // This invitation's public build settings, all from config.json (see config.example.json and scripts/site-config.mjs).
  // The recipient and the encryption key are NOT there: they stay in .env, which this public repo never commits.
  const site = loadSiteConfig(mode, import.meta.dirname);
  console.log(
    `[site-config] template "${site.template}", base "${site.base}", mail → ${site.endpoint}`,
  );

  return {
    // Where the site is served from: "/" for a domain of its own, or "/<repo>/" for a GitHub Pages project site
    // (https://<user>.github.io/<repo>/). It's "base" in config.json; every asset, link and the router follow it.
    base: site.base,
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
    define: {
      "import.meta.env.VITE_MAIL_ENDPOINT": JSON.stringify(site.endpoint),
      "import.meta.env.VITE_MAIL_TEMPLATE": JSON.stringify(site.template),
    },
    plugins: [
      mailCredentials(),
      phpMailDev(site.devApiDir, site.endpoint),
      tailwindcss(),
      tanstackStart({
        // src/server.ts wraps the SSR handler with our error page
        server: { entry: "server" },
        // Render "/" to static HTML at build time so dist/client is a complete static site (Hostinger, any host).
        prerender: { enabled: true, crawlLinks: false },
      }),
      viteReact(),
    ],
  };
});
