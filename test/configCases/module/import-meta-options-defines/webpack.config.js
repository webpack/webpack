"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node14",
	module: {
		parser: {
			javascript: {
				importMeta: {
					env: false,
					custom: false,
					build: false
				}
			}
		}
	},
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		chunkFormat: "module"
	},
	plugins: [
		new DefinePlugin({
			"import.meta.custom": JSON.stringify("custom-value"),
			"import.meta.build.time": JSON.stringify("now"),
			"import.meta.enabledCustom": JSON.stringify("enabled-value"),
			"import.meta.env": {
				A: JSON.stringify("a")
			},
			"import.meta.env.B": JSON.stringify("b")
		})
	]
};
