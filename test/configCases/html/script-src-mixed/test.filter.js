"use strict";

// Tests use `import.meta.url` to locate emitted chunks at runtime and
// `globalThis` in fixtures, both of which require Node 12+.
module.exports = function filter() {
	const major = Number(process.versions.node.split(".")[0]);
	return major >= 12;
};
