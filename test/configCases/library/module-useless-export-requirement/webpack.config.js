"use strict";

/** @typedef {import("../../../../").Configuration} Configuration */

/** @type {Configuration} */
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

/** @type {Configuration[]} */
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
	},
	{
		name: "entry4",
		entry: "./entry4.js",
		css: true
	}
];

module.exports = configs.reduce(
	/** @type {(result: EXPECTED_ANY, config: EXPECTED_ANY) => Configuration[]} */ (
		result,
		{ name, entry, optimization, css }
	) => {
		const extra = css
			? { experiments: { ...common.experiments, css: true } }
			: {};
		result.push({
			...common,
			...extra,
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
			...extra,
			optimization: {
				...optimization,
				concatenateModules: false
			},
			entry: {
				[`${name}-no-concat`]: entry
			}
		});
		return result;
	},
	[]
);
