"use strict";

module.exports = function filter(config) {
	// Deno's persistent-cache snapshot timing leaves this case's modules
	// uncached on the 2nd build, so skip only the filesystem-cache variant.
	if (process.versions.deno && config && config.cache) return false;
	// Bun's persistent cache is likewise nondeterministic here ("Pack got
	// invalid", modules not re-cached), so skip the filesystem-cache variant.
	if (process.versions.bun && config && config.cache) return false;
	return true;
};
