"use strict";

const path = require("path");

// The `.js` -> `.ts` extensionAlias that `experiments.typescript` installs must
// not make a package directory named `pkg.js` unresolvable.

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.js",
	resolve: {
		alias: {
			vendor: path.resolve(__dirname, "node_modules")
		}
	}
};
