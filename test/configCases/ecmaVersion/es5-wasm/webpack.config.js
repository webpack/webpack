"use strict";

/**
 * @param {string} name variant name
 * @param {import("../../../../").Experiments} experiments which wasm support to enable
 * @returns {import("../../../../").Configuration} configuration
 */
const variant = (name, experiments) => ({
	name,
	target: ["node", "es5"],
	entry: `./${name}.js`,
	output: {
		filename: `${name}.js`
	},
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type:
					experiments.asyncWebAssembly === true
						? "webassembly/async"
						: "webassembly/sync"
			}
		]
	},
	experiments
});

// The wasm loaders read `fs` and build a fake fetch response, both of which
// have to come out es5 on an es5 target. Sync and async are separate plugins
// writing the same shape, so both are read.
/** @type {import("../../../../").Configuration[]} */
module.exports = [
	variant("async", { asyncWebAssembly: true }),
	variant("sync", { syncWebAssembly: true })
];
