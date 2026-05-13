"use strict";

// Fixtures use `globalThis` to keep side effects from being tree-shaken,
// which is only available in Node 12+.
module.exports = function filter() {
	const major = Number(process.versions.node.split(".")[0]);
	return major >= 12;
};
