"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	entry: {
		require: "./require.js",
		import: "./import.js"
	},
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		filename: "[name].mjs"
	},
	plugins: [
		new DefinePlugin({
			NODE_VERSION: JSON.stringify(
				process.versions.node.split(".").map(Number)[0]
			)
		})
	]
};
