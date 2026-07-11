"use strict";

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
	plugins: []
};
