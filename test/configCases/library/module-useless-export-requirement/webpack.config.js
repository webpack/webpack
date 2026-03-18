"use strict";

const common = {
	mode: "production",
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

const configs = [
	{
		name: "entry1",
		entry: "./entry1.js"
	},
	{
		name: "entry2",
		entry: "./entry2.js"
	},
	{
		name: "entry3",
		entry: "./entry3.js",
		optimization: {
			avoidEntryIife: false
		}
	}
];

/** @type {import("../../../../").Configuration[]} */
module.exports = configs.reduce((result, { name, entry, optimization }) => {
	result.push({
		...common,
		optimization: {
			...optimization,
			concatenateModules: true
		},
		entry: {
			[`${name}-concat`]: entry
		}
	});
	result.push({
		...common,
		optimization: {
			...optimization,
			concatenateModules: false
		},
		entry: {
			[`${name}-no-concat`]: entry
		}
	});
	return result;
}, []);
