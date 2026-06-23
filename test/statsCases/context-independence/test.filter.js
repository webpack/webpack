"use strict";

// These cases load ESM-only @babel/core@8, which needs Node ^22.18 || >=24.11
// (subpath imports) and can't load under Jest's vm below Node 24.9 or on Deno/Bun.
module.exports = () => {
	if ("deno" in process.versions || "bun" in process.versions) return false;
	const [major, minor] = process.versions.node.split(".").map(Number);
	return major > 24 || (major === 24 && minor >= 9);
};
