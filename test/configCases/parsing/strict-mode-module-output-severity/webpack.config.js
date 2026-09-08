"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	output: {
		module: true,
		chunkFormat: "module",
		library: { type: "module" }
	},
	module: {
		rules: [
			{
				test: /suppressed\.js$/,
				parser: { strictModeViolations: false }
			}
		]
	}
};
