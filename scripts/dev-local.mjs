import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

if (process.env.NODE_ENV === "production") throw new Error("Local database mode is development-only.");
await mkdir(".local", { recursive: true });
const secretPath = resolve(".local/auth-secret");
let secret;
try { secret = await readFile(secretPath, "utf8"); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  secret = randomBytes(48).toString("hex");
  await writeFile(secretPath, secret, { mode: 0o600, flag: "wx" });
}
const port = process.env.PORT || "3000";
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error("PORT must be a number between 1 and 65535.");
}
console.log("Local PostgreSQL development mode. Data is stored in .local/; no external APIs are called.");
console.log(`Open http://localhost:${port}`);
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "localhost", "--port", port], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_DRIVER: "pglite", LOCAL_DATABASE_PATH: process.env.LOCAL_DATABASE_PATH || resolve(".local/database"), BETTER_AUTH_SECRET: secret, BETTER_AUTH_URL: `http://localhost:${port}` },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
