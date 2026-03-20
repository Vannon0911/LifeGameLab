import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";

function probeHttp(url, timeoutMs = 800) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode || 0);
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

async function findFreePort(host = "127.0.0.1") {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, host, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      server.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

export async function startLocalHttpServer(rootDir, options = {}) {
  const host = options.host || "127.0.0.1";
  const timeoutMs = Number(options.timeoutMs || 15_000);
  const port = Number.isFinite(options.port) ? options.port : await findFreePort(host);
  const cmd = process.platform === "win32" ? "python" : "python3";

  const server = spawn(cmd, ["-m", "http.server", String(port), "--bind", host], {
    cwd: rootDir,
    stdio: ["ignore", "ignore", "pipe"],
  });

  let stderrBuffer = "";
  server.stderr?.on("data", (chunk) => {
    stderrBuffer += String(chunk || "");
    if (stderrBuffer.length > 8000) stderrBuffer = stderrBuffer.slice(-8000);
  });

  const baseUrl = `http://${host}:${port}`;
  const startedAt = Date.now();
  // Readiness check requires an actual HTTP response, not just open port.
  while (Date.now() - startedAt < timeoutMs) {
    if (server.exitCode != null) {
      throw new Error(`Local HTTP server exited early (exit=${server.exitCode}). ${stderrBuffer.trim()}`);
    }
    try {
      const status = await probeHttp(`${baseUrl}/`, 800);
      if (status >= 200 && status < 500) {
        return {
          host,
          port,
          baseUrl,
          process: server,
          stop() {
            if (!server.killed) {
              try {
                server.kill("SIGTERM");
              } catch {}
            }
          },
        };
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  try {
    if (!server.killed) server.kill("SIGTERM");
  } catch {}
  throw new Error(`Local HTTP server did not become ready within ${timeoutMs}ms. ${stderrBuffer.trim()}`);
}
