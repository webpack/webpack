"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
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
