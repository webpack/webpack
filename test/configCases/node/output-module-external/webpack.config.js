"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	experiments: {
		outputModule: true
	},
	output: {
		module: true
	},
	plugins: [
		new DefinePlugin({
			NODE_VERSION: JSON.stringify(
				process.versions.node.split(".").map(Number)[0]
			)
		})
	]
};
