"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	entry: "./index.cjs",
	optimization: {
		moduleIds: "named"
	},
	module: {
		parser: {
			javascript: {
				createRequire: true
			}
		}
	}
};
