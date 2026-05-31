/**
 * prepare-vercel.mjs
 *
 * Assembles the Vercel Build Output API v3 structure from Nitro's output.
 * Nitro (vercel preset) writes server bundle to dist/server and static
 * assets to dist/client. This script copies them into the correct locations.
 *
 * Final structure expected by Vercel:
 *   .vercel/output/
 *     config.json                   <- routing rules (copied from dist/config.json)
 *     static/                       <- copied from dist/client
 *     functions/
 *       __server.func/              <- copied from dist/server
 *         .vc-config.json           <- Vercel function runtime config
 */

import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const distServer = resolve(root, "dist/server");
const distClient = resolve(root, "dist/client");
const distConfig = resolve(root, "dist/config.json");
const vercelOut = resolve(root, ".vercel/output");
const functionsDir = resolve(vercelOut, "functions/__server.func");
const staticDir = resolve(vercelOut, "static");

// 1. Ensure output directories exist
mkdirSync(functionsDir, { recursive: true });
mkdirSync(staticDir, { recursive: true });

// 2. Copy server bundle → functions/__server.func/
console.log("Copying server bundle → .vercel/output/functions/__server.func/");
cpSync(distServer, functionsDir, { recursive: true });

// 3. Copy static assets → static/
if (existsSync(distClient)) {
  console.log("Copying static assets → .vercel/output/static/");
  cpSync(distClient, staticDir, { recursive: true });
}

// 4. Write .vc-config.json (Vercel serverless function config)
const vcConfig = {
  handler: "index.mjs",
  launcherType: "Nodejs",
  shouldAddHelpers: false,
  supportsResponseStreaming: true,
  runtime: "nodejs22.x",
};
writeFileSync(
  resolve(functionsDir, ".vc-config.json"),
  JSON.stringify(vcConfig, null, 2)
);
console.log("Written .vc-config.json");

// 5. Copy config.json (Nitro-generated routing rules)
if (existsSync(distConfig)) {
  const config = JSON.parse(readFileSync(distConfig, "utf-8"));
  writeFileSync(resolve(vercelOut, "config.json"), JSON.stringify(config, null, 2));
  console.log("Copied dist/config.json → .vercel/output/config.json");
} else {
  // Fallback routing config if dist/config.json is missing
  const fallback = {
    version: 3,
    routes: [
      {
        headers: { "cache-control": "public, max-age=31536000, immutable" },
        src: "/assets/(.*)",
      },
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/__server" },
    ],
  };
  writeFileSync(resolve(vercelOut, "config.json"), JSON.stringify(fallback, null, 2));
  console.log("Written fallback config.json");
}

console.log("\n✅ .vercel/output ready:");
console.log("   functions/__server.func/index.mjs  ← SSR handler");
console.log("   static/                             ← client assets");
console.log("   config.json                         ← routing rules");
