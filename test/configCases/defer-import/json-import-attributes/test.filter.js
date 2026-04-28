"use strict";

// The Node.js reference path uses `webpackIgnore: true` to delegate the
// dynamic `import("./config.json", { with: { type: "json" } })` to the host.
// Stable, unflagged support for the `with` import-attributes syntax landed
// in Node.js v22 — earlier versions either reject the syntax or require the
// experimental `assert` form.
module.exports = () => {
	const [major] = process.versions.node.split(".").map(Number);
	return major >= 22;
};
