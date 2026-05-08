"use strict";

const Module = require("module");
const path = require("path");

// Detect whether the running Node.js activates the "module-sync" community
// condition for require() (Node.js v22.10+). Older versions fall through to
// the "default" branch of the fixture and return "default" instead of
// "module-sync", in which case the case is skipped.
let supportsModuleSync;
try {
	const nodeRequire = Module.createRequire(path.join(__dirname, "index.js"));
	supportsModuleSync = nodeRequire("module-sync-only") === "module-sync";
} catch (_err) {
	supportsModuleSync = false;
}

module.exports = () => supportsModuleSync;
