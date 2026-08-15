import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gitDir = join(root, ".git");
const src = join(root, ".githooks", "pre-commit");
const destDir = join(gitDir, "hooks");
const dest = join(destDir, "pre-commit");

if (!existsSync(gitDir) || !existsSync(src)) {
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
try {
  chmodSync(dest, 0o755);
} catch {
  // chmod is best-effort on Windows
}
