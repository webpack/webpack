"use strict";

// ts-loader runs the `typescript` package, which needs Node.js 14.17 or later.
module.exports = () => {
	const [major, minor] = process.versions.node.split(".").map(Number);
	return major > 14 || (major === 14 && minor >= 17);
};
