import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const libDir = resolve(root, "lib");

await mkdir(libDir, { recursive: true });

const clientBundle = await build({
  absWorkingDir: root,
  entryPoints: ["src/client/index.ts"],
  bundle: true,
  write: false,
  format: "iife",
  globalName: "DshTideHint",
  platform: "browser",
  target: ["chrome110"],
  jsx: "transform",
  jsxFactory: "React.createElement",
  legalComments: "none",
  logLevel: "silent",
});

const clientSource = clientBundle.outputFiles[0].text;
const wrappedClient = `window.__ModuleLoader__.load({
  id: "dsh-tide-hint",
  factory(require) {
    const React = require("react");
${clientSource}
    return DshTideHint.createClientPlugin(React);
  },
});
`;

await writeFile(resolve(libDir, "client.js"), wrappedClient, "utf8");

const hostBundle = await build({
  absWorkingDir: root,
  entryPoints: ["src/index.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  target: ["node20"],
  legalComments: "none",
  logLevel: "silent",
});

await writeFile(resolve(libDir, "index.js"), hostBundle.outputFiles[0].text, "utf8");
