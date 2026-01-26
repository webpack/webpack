"use strict";

const { sharing } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		entry1: "./entry1.js",
		entry2: "./entry2.js"
	},
	output: {
		filename: "[name].mjs",
		module: true,
		library: {
			type: "module"
		}
	},
	experiments: {
		outputModule: true
	},
	plugins: [
		new sharing.SharePlugin({
			shared: {
				lib: { requiredVersion: "auto" },
				"lib/esm": { requiredVersion: "auto" }
			}
		})
	]
};
