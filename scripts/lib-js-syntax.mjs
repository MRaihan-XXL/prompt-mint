// jsSyntaxCheck(html) → string[] — ekstrak inline <script> lalu node --check per blok.
// Menangkap class bug yang lolos size/site-ness (bukti: unary "-(x) ** 2" di
// firefly-meadow → SyntaxError → scene WebGL hitam total padahal "site-ness OK").
// Blok JSON-LD/importmap/speculationrules dilewati (bukan JS). src= dilewati (file terpisah).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function jsSyntaxCheck(html) {
  const errs = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let m, i = 0;
  while ((m = re.exec(html))) {
    const attrs = m[1] || "", code = m[2].trim();
    if (!code || /\bsrc\s*=/.test(attrs)) continue;
    const typeM = attrs.match(/type\s*=\s*["']([^"']+)["']/i);
    const type = (typeM ? typeM[1] : "").toLowerCase();
    if (type && type !== "module" && type !== "text/javascript") continue;
    const tmp = path.join(os.tmpdir(), `dg-syntax-${process.pid}-${i++}${type === "module" ? ".mjs" : ".js"}`);
    fs.writeFileSync(tmp, code);
    const r = spawnSync(process.execPath, ["--check", tmp], { encoding: "utf8" });
    fs.rmSync(tmp, { force: true });
    if (r.status !== 0) errs.push(((r.stderr || "").split("\n").find((l) => /Error/.test(l)) || "syntax error").trim().slice(0, 140));
  }
  return errs;
}
