const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	experiments: {
		outputModule: true
	},
	output: {
		library: {
			type: "module"
		},
		filename: "main.js",
		path: path.resolve(__dirname, "dist"),
		module: true
	},
	externalsType: "module",
	externals: {
		"./external-module": "module ./external-module"
	}
};
