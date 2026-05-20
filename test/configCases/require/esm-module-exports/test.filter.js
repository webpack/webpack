"use strict";

// Node.js's `require(esm)` (and the "module.exports" named-export interop) is
// unflagged from v22.12.0 and v23.0.0 onwards.
module.exports = function filter() {
	const [major, minor] = process.versions.node.split(".").map(Number);
	return major > 22 || (major === 22 && minor >= 12);
};
