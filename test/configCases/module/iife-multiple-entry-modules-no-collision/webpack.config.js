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
		name: "nocollide-true",
		output: { ...base.output, filename: "nocollide-true.mjs" },
		optimization: { ...base.optimization, avoidEntryIife: true }
	},
	{
		...base,
		name: "nocollide-false",
		output: { ...base.output, filename: "nocollide-false.mjs" },
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
