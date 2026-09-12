"use strict";

// Bun accepts JSON imports without attributes, so it cannot detect this regression.
module.exports = () =>
	!process.versions.bun &&
	(Boolean(process.versions.deno) ||
		Number(process.versions.node.split(".")[0]) >= 22);
