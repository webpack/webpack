"use strict";

/** @type {import("../../../../").Configuration} */
const base = {
	entry: ["./index1.js", "./index2.js"],
	output: {
		module: true
	},
	optimization: {
		concatenateModules: true
	},
	experiments: {
		outputModule: true
	},
	target: "es2020"
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		...base,
		name: "avoid",
		output: { ...base.output, filename: "avoid.mjs" },
		optimization: { ...base.optimization, avoidEntryIife: true }
	},
	{
		...base,
		name: "keep",
		output: { ...base.output, filename: "keep.mjs" },
		optimization: { ...base.optimization, avoidEntryIife: false }
	},
	{
		name: "test-output",
		entry: "./test.js",
		output: {
			filename: "test.js"
		}
	}
];
