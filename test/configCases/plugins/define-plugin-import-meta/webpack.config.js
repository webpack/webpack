"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
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
		new DefinePlugin({
			"import.meta.config": { TOKEN: JSON.stringify("token") }
		})
	]
};
