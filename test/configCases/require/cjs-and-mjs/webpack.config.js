"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		js: "./js.mjs",
		ts: "./ts.mts",
		dynamic: "./dynamic.js"
	},
	output: {
		filename: "[name].js"
	},
	target: "node",
	module: {
		parser: {
			javascript: {
				createRequire: true
			}
		},
		rules: [
			{
				test: /\.[mc]?tsx?$/,
				use: "ts-loader"
			}
		]
	},
	resolve: {
		extensionAlias: {
			".mjs": [".mts", ".mjs"],
			".cjs": [".cts", ".cjs"]
		}
	}
};
