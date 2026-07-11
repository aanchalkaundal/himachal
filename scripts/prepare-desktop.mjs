/**
 * Assemble the Next.js standalone output for packaging. `next build` (with
 * DESKTOP=1) writes `.next/standalone` but WITHOUT the static assets, public
 * folder, or our pre-built Remotion bundle — copy those in so the shipped server
 * is fully self-contained. Run after `next build` + `bundle-remotion`.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

function copy(from, to, label) {
  if (!fs.existsSync(from)) {
    console.log(`- skip ${label} (not found: ${from})`);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`✓ copied ${label}`);
}

if (!fs.existsSync(standalone)) {
  console.error("✗ .next/standalone not found. Run `next build` with DESKTOP=1 first.");
  process.exit(1);
}

copy(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), "static assets");
copy(path.join(root, "public"), path.join(standalone, "public"), "public/");
copy(path.join(root, "remotion-serve"), path.join(standalone, "remotion-serve"), "remotion bundle");

console.log("✓ standalone bundle ready:", standalone);
