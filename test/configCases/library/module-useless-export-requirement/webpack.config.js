"use strict";

// const webpack = require("../../../../");

const common = {
	output: {
		module: true,
		filename: "[name].mjs",
		library: {
			type: "module"
		},
		chunkFormat: "module"
	},
	experiments: {
		outputModule: true
	}
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		...common,
		entry: {
			bundle0: "./entry1.js"
		}
	},
	{
		...common,
		entry: {
			bundle1: "./entry2.js"
		}
	},
	{
		...common,
		optimization: {
			concatenateModules: false,
			avoidEntryIife: false
		},
		entry: {
			bundle2: "./entry3.js"
		}
	}
];
