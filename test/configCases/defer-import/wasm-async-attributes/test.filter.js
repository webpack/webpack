"use strict";

const supportsWebAssembly = require("../../../helpers/supportsWebAssembly");

// Native dynamic `import("./mod.wasm")` — used here as the Node.js reference
// via `webpackIgnore: true` — became available in Node.js v22 (still emits an
// experimental warning, but works without `--experimental-wasm-modules`).
module.exports = () => {
	if (!supportsWebAssembly()) return false;
	const [major] = process.versions.node.split(".").map(Number);
	return major >= 22;
};
