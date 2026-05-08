"use strict";

const cp = require("child_process");
const path = require("path");

// Detect whether the running Node.js activates the "module-sync" community
// condition for require() (Node.js v22.10+). Node.js < 22.10 will fall through
// to the "default" branch of the fixture and return "default" instead of
// "module-sync". A child process is used because Jest patches Module.createRequire
// in a way that drops the "module-sync" condition from the active set.
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
