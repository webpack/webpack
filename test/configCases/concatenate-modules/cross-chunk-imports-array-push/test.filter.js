"use strict";

// The ESM bundle runs in a `vm` module context, which the harness offers from Node 12.
module.exports = function filter() {
	const major = Number(process.versions.node.split(".")[0]);
	return major >= 12;
};
