const { spawnSync } = require("node:child_process");
const path = require("node:path");

const php = process.env.CALC_PHP_BINARY || "php";
const modules = spawnSync(php, ["-m"], { encoding: "utf8" });
if (modules.status !== 0) process.exit(modules.status || 1);

const args = [];
if (!/pdo_sqlite/i.test(modules.stdout)) {
  if (process.platform !== "win32") {
    throw new Error("pdo_sqlite is required");
  }
  const located = spawnSync("where.exe", ["php"], { encoding: "utf8" });
  const phpPath = located.stdout.split(/\r?\n/).find(Boolean);
  const extensionDir = path.join(path.dirname(phpPath), "ext");
  args.push(
    "-d", "extension_dir=" + extensionDir,
    "-d", "extension=pdo_sqlite",
    "-d", "extension=sqlite3"
  );
}
args.push(path.join(__dirname, "php", "analytics_test.php"));
const result = spawnSync(php, args, { stdio: "inherit" });
process.exit(result.status === null ? 1 : result.status);
