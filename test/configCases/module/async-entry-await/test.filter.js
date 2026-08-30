"use strict";

// The entry and the generated startup both use top-level `await`, which the
// runner's `vm.SourceTextModule` cannot parse before Node.js 14.8.
module.exports = function filter() {
	const [major, minor] = process.versions.node.split(".").map(Number);
	return major > 14 || (major === 14 && minor >= 8);
};
