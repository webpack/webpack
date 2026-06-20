"use strict";

// Node.js's `require(esm)` (and the "module.exports" named-export interop) is
// unflagged from v22.12.0 and v23.0.0 onwards.
module.exports = function filter(config) {
	const [major, minor] = process.versions.node.split(".").map(Number);
	if (!(major > 22 || (major === 22 && minor >= 12))) return false;
	// TODO Bun's `require(esm)` named-export interop differs from V8/Node, so the
	// unwrapped values are undefined here; skip under Bun.
	if (process.versions.bun) return false;
	// Deno's persistent-cache snapshot timing leaves this case's modules
	// uncached on the 2nd build, so skip only the filesystem-cache variant.
	if (process.versions.deno && config && config.cache) return false;
	return true;
};
