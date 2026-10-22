"use strict";

// The generated library uses top-level await, supported by Node.js 14.8 onward.
/** @returns {boolean} whether the runtime can execute the library */
module.exports = function filter() {
	const [major, minor] = process.versions.node.split(".").map(Number);
	return major > 14 || (major === 14 && minor >= 8);
};
