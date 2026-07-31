"use strict";

// Reading the emitted bundle uses `__non_webpack_require__`, which webpack
// serves in ESM output through `createRequire` — added in Node 12.
module.exports = function filter() {
	const major = Number(process.versions.node.split(".")[0]);
	return major >= 12;
};
