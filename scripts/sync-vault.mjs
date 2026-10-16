#!/usr/bin/env node
// Sync premium prompts from prompt-vault -> Supabase Storage (private bucket "premium").
// The gate function (/api/prompt/:id) serves premium/{id}.md AFTER auth+subscription check.
//
// Each vault .md is scaffolded (title/metadata/fenced prompt/notes). We upload ONLY the
// clean prompt (inside the ``` fence) so "Copy prompt" matches the free-tier experience.
//
// Usage:
//   node scripts/sync-vault.mjs
// Env (or a .env file in the repo root):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (optional) VAULT_DIR

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VAULT = process.env.VAULT_DIR || path.resolve(ROOT, "..", "prompt-vault", "prompts");
const BUCKET = "premium";

// Minimal .env loader (no dependency). Existing process.env always wins.
try {
  const text = await fs.readFile(path.join(ROOT, ".env"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env is fine */
}

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("ERROR: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (env or .env).");
  process.exit(1);
}

function extractPrompt(md) {
  const m = md.match(/```[a-zA-Z]*\r?\n([\s\S]*?)```/);
  return (m ? m[1] : md).trim();
}

async function ensureBucket() {
  const res = await fetch(`${SUPA_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: BUCKET, public: false }),
  });
  if (res.ok) {
    console.log(`bucket "${BUCKET}" created (private)`);
    return;
  }
  const text = await res.text();
  if (res.status === 409 || /exist/i.test(text)) {
    console.log(`bucket "${BUCKET}" already exists (private)`);
    return;
  }
  console.warn(`ensureBucket ${res.status}: ${text}`);
}

async function upload(id, content) {
  const res = await fetch(
    `${SUPA_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(id)}.md?upsert=true`,
    {
      method: "POST",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "text/markdown" },
      body: content,
    }
  );
  if (!res.ok) throw new Error(`${id}.md -> ${res.status} ${await res.text()}`);
}

async function main() {
  console.log("Vault dir:", VAULT);
  await ensureBucket();

  let total = 0;
  for (const tier of ["pro", "max"]) {
    const dir = path.join(VAULT, tier);
    let files = [];
    try {
      files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md"));
    } catch {
      console.warn(`skip ${tier} (missing ${dir})`);
      continue;
    }
    for (const f of files) {
      const id = path.basename(f, ".md");
      const raw = await fs.readFile(path.join(dir, f), "utf8");
      await upload(id, extractPrompt(raw));
      console.log(`  + ${tier}/${id}.md`);
      total++;
    }
  }
  console.log(`Done. ${total} premium prompts synced to bucket "${BUCKET}".`);
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
