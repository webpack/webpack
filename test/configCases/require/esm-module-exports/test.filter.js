"use strict";

// Node.js's `require(esm)` (and the "module.exports" named-export interop) is
// unflagged from v22.12.0 and v23.0.0 onwards.
module.exports = function filter(config) {
	const [major, minor] = process.versions.node.split(".").map(Number);
	if (!(major > 22 || (major === 22 && minor >= 12))) return false;
	// Deno's persistent-cache snapshot timing leaves this case's modules
	// uncached on the 2nd build, so skip only the filesystem-cache variant.
	if (process.versions.deno && config && config.cache) return false;
	// Bun's persistent cache is likewise nondeterministic here ("Pack got
	// invalid", modules not re-cached), so skip the filesystem-cache variant.
	if (process.versions.bun && config && config.cache) return false;
	return true;
};
