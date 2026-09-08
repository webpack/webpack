"use strict";

const EnvironmentPlugin = require("../../../../").EnvironmentPlugin;

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node12.18",
	dotenv: true,
	plugins: [
		new EnvironmentPlugin({
			AAA: "aaa"
		})
	],
	output: {
		module: true,
		chunkFormat: "module"
	},
	externals: {
		fs: "commonjs fs"
	}
};
