"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	module: {
		rules: [
			{
				test: path.resolve(__dirname, "utility.cjs"),
				sideEffects: false
			}
		]
	},
	optimization: {
		minimize: false,
		moduleIds: "named",
		mangleExports: false,
		usedExports: true,
		sideEffects: true,
		concatenateModules: false
	}
};
