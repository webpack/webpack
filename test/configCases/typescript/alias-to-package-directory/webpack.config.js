"use strict";

const path = require("path");

// The `.js` -> `.ts` extensionAlias that `experiments.typescript` installs must
// not make a package directory named `pkg.js` unresolvable. Pinned here instead
// of via `experiments.typescript` so the case also runs below Node.js 22.6.

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.js",
	resolve: {
		alias: {
			vendor: path.resolve(__dirname, "node_modules")
		},
		extensionAlias: {
			".js": [".js", ".ts"],
			".cjs": [".cjs", ".cts"],
			".mjs": [".mjs", ".mts"]
		}
	}
};
