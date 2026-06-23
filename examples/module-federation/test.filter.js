"use strict";

// babel-loader loads ESM-only @babel/core@8 via require(); under Jest's
// experimental vm modules that needs Node >= 24.9.
module.exports = () => {
	const [major, minor] = process.versions.node.split(".").map(Number);
	return major > 24 || (major === 24 && minor >= 9);
};
