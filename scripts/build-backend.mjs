import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const result = spawnSync(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "-p", "apps/backend/tsconfig.json"],
  { cwd: root, stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);
const out = new URL("../apps/backend/dist/", import.meta.url);
mkdirSync(out, { recursive: true });
cpSync(
  new URL("../apps/backend/migrations/", import.meta.url),
  new URL("migrations/", out),
  { recursive: true },
);
writeFileSync(
  new URL("package.json", out),
  JSON.stringify(
    { type: "commonjs", main: "index.cjs", engines: { node: ">=22.12" } },
    null,
    2,
  ),
);
writeFileSync(
  new URL("index.cjs", out),
  'module.exports = require("./apps/backend/src/ai/yandex.js");\n',
);
writeFileSync(
  new URL("server.cjs", out),
  'require("./apps/backend/src/server.js");\n',
);
console.log(
  "Backend built in apps/backend/dist. Cloud Function entry point: index.handler",
);
