"use strict";

// The bundles read the `globalThis` binding these cases tell webpack the
// target has, which Node 10 does not define.
module.exports = function filter() {
	const major = Number(process.versions.node.split(".")[0]);
	return major >= 12;
};
