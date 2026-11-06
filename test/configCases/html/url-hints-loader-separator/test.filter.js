"use strict";

// HTML module support imports the parsed HTML via an ES module export,
// which needs Jest's ESM support via `--experimental-vm-modules` (Node 12+).
module.exports = function filter() {
	const major = Number(process.versions.node.split(".")[0]);
	return major >= 12;
};
