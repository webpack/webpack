"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedAliases: true
	},
	resolve: {
		alias: {
			// Neither directory exists, so the imports above prove both aliases were
			// applied — and neither name ever appears as a `rawRequest`.
			[path.resolve(__dirname, "src/real")]: path.resolve(
				__dirname,
				"src/other"
			),
			[path.resolve(__dirname, "src/second")]: path.resolve(
				__dirname,
				"src/other"
			),
			"@bare/thing": path.resolve(__dirname, "thing.js")
		}
	}
};
