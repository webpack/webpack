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
	externalsType: "module",
	optimization: {
		concatenateModules: true,
		usedExports: true
	}
};
