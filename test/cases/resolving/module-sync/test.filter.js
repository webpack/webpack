"use strict";

const cp = require("child_process");
const path = require("path");

// Detect whether the running Node.js activates the "module-sync" community
// condition for require() (Node.js v22.10+). Older versions fall through to
// the "default" branch of the fixture and return "default", in which case the
// case is skipped. Run in a child process — Jest's runtime resolves package
// "exports" with a condition set that excludes "module-sync".
let supportsModuleSync;
try {
	const out = cp.execFileSync(
		process.execPath,
		[
			"-e",
			`const m = require("module"); const r = m.createRequire(${JSON.stringify(
				path.join(__dirname, "index.js")
			)}); process.stdout.write(r("module-sync-only"));`
		],
		{ stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" }
	);
	supportsModuleSync = out === "module-sync";
} catch (_err) {
	supportsModuleSync = false;
}

module.exports = () => supportsModuleSync;
