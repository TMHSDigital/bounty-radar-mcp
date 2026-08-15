import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
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

if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
try {
  chmodSync(dest, 0o755);
} catch {
  // chmod is best-effort on Windows
}

const configured = spawnSync("git", ["config", "--local", "core.hooksPath", ".githooks"], {
  cwd: root,
  encoding: "utf8",
});
if (configured.status !== 0) {
  const err = (configured.stderr || configured.error?.message || "git config failed").trim();
  console.error(`install-hooks: failed to set core.hooksPath: ${err}`);
  process.exit(1);
}
