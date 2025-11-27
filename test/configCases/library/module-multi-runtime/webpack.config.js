"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: {
		entry1: "./entry1.js",
		entry2: "./entry2.js",
		entry3: "./entry3.js"
	},
	output: {
		module: true,
		library: {
			type: "module"
		},
		filename: "[name].mjs"
	},
	experiments: {
		outputModule: true
	},
	externalsType: "module",
	optimization: {
		concatenateModules: true,
		usedExports: true
	}
};
