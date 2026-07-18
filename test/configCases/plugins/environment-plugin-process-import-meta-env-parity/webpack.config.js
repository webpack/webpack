"use strict";

const { EnvironmentPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		chunkFormat: "module"
	},
	optimization: {
		minimize: false,
		concatenateModules: false
	},
	plugins: [
		new EnvironmentPlugin({
			ENV_PLUGIN_CUSTOM: "first"
		}),
		new EnvironmentPlugin({
			ENV_PLUGIN_CUSTOM: "second"
		})
	]
};
