"use strict";

// Tests use `import.meta.url` to locate emitted chunks at runtime, which
// requires the bundle to run as a real ES module. Jest's ESM support
// (via `--experimental-vm-modules`) needs Node 12+.
module.exports = function filter() {
	const major = Number(process.versions.node.split(".")[0]);
	return major >= 12;
};
