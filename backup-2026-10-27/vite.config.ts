import { spawn } from "node:child_process";
import { request } from "node:http";
import { createServer } from "node:net";
import { defineConfig, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Dev only: runs api/send-mail.php with PHP's built-in server on a free port and forwards /send-mail.php to it, so
 * RSVPs and wishes really send from `npm run dev` (using the project's .env), as they will from the hosted API.
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
      const php = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", "api"], { stdio: "ignore" });
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
