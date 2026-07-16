"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	optimization: {
		usedExports: true,
		sideEffects: false,
		minimize: false
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
