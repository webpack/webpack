"use strict";

const EnvironmentPlugin = require("../../../../").EnvironmentPlugin;

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node-14",
	dotenv: true,
	plugins: [
		new EnvironmentPlugin({
			AAA: "aaa"
		})
	],
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		chunkFormat: "module"
	}
};
