"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
const base = {
	entry: ["./index1.js", "./index2.js"],
	output: {
		module: true
	},
	optimization: {
		concatenateModules: true
	},
	target: "es2020"
};

/** @type {Configuration[]} */
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
