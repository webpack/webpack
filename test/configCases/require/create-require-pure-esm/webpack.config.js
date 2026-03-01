"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	entry: "./index.mjs",
	optimization: {
		moduleIds: "named"
	},
	module: {
		parser: {
			javascript: {
				createRequire: true
			},
			"javascript/esm": {
				commonjs: false,
				createRequire: true
			}
		}
	}
};
