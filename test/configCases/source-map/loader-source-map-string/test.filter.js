"use strict";

// The loader loads ESM-only @babel/core@8, which requires Node ^22.18 || >=24.9
// (Jest vm + subpath imports); gate to the versions where it can run.
module.exports = () => {
	const [major, minor] = process.versions.node.split(".").map(Number);
	return major > 24 || (major === 24 && minor >= 9);
};
