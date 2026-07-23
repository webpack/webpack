"use strict";

/** @typedef {import("../../../../").Configuration} Configuration */
/** @typedef {import("../../../../").GeneratorOptionsByModuleTypeKnown} GeneratorOptionsByModuleTypeKnown */

const common = {
	target: "web",
	node: { __dirname: false, __filename: false },
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				type: "css/module",
				/** @type {GeneratorOptionsByModuleTypeKnown["css/module"]} */
				generator: { localIdentName: "s-[local]" }
			}
		]
	},
	experiments: { css: true }
};

/** @type {Configuration[]} */
module.exports = [
	{ ...common, mode: "development" },
	{ ...common, mode: "production", devtool: false }
];
