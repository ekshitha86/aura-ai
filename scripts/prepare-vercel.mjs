/**
 * prepare-vercel.mjs
 *
 * Assembles the Vercel Build Output API v3 structure from Nitro's output.
 * Nitro (vercel preset) writes config to .vercel/output but keeps the
 * actual server bundle in dist/server and static assets in dist/client.
 * This script copies them into the correct locations.
 *
 * Final structure:
 *   .vercel/output/
 *     config.json          <- Nitro generates this (routing rules)
 *     static/              <- copied from dist/client
 *     functions/
 *       __server.func/     <- copied from dist/server
 *         .vc-config.json  <- Vercel function config
 */

import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const distServer = resolve(root, "dist/server");
const distClient = resolve(root, "dist/client");
const vercelOut = resolve(root, ".vercel/output");
const functionsDir = resolve(vercelOut, "functions/__server.func");
const staticDir = resolve(vercelOut, "static");

// 1. Ensure output directories exist
mkdirSync(functionsDir, { recursive: true });
mkdirSync(staticDir, { recursive: true });

// 2. Copy server bundle → functions/__server.func/
console.log("Copying server bundle to .vercel/output/functions/__server.func/ ...");
cpSync(distServer, functionsDir, { recursive: true });

// 3. Copy static assets → static/
if (existsSync(distClient)) {
  console.log("Copying static assets to .vercel/output/static/ ...");
  cpSync(distClient, staticDir, { recursive: true });
}

// 4. Write .vc-config.json for the serverless function
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

// 5. Ensure config.json exists in .vercel/output (Nitro writes it there)
const configPath = resolve(vercelOut, "config.json");
if (!existsSync(configPath)) {
  // Fallback: write a basic routing config
  const config = {
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
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

console.log("✅ .vercel/output is ready for deployment.");
console.log("   functions/__server.func/index.mjs -> SSR handler");
console.log("   static/                            -> client assets");
