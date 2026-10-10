"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ target: "node", output: { module: false } },
	{ target: "node", output: { module: true } },
	{ target: "async-node", output: { module: false } },
	{ target: "universal", output: { module: true } }
].map((options) => ({
	...options,
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/async"
			}
		]
	},
	experiments: { asyncWebAssembly: true, sourceImport: true }
}));
