"use strict";

/** @type {import("../../../../").Configuration} */
const base = {
	entry: ["./first.js", "./second.js"],
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
		name: "concat-true",
		output: { ...base.output, filename: "concat-true.mjs" },
		optimization: { ...base.optimization, avoidEntryIife: true }
	},
	{
		...base,
		name: "concat-false",
		output: { ...base.output, filename: "concat-false.mjs" },
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
