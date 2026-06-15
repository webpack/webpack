"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["node", "web"],
	// each supported external type usable in a universal ESM build
	externals: {
		nodeCommonjs: "node-commonjs fs",
		varExpr: "var 1 + 2",
		staticModule: "module fs",
		dynamic: "import os"
	},
	output: { module: true },
	experiments: { outputModule: true }
};
