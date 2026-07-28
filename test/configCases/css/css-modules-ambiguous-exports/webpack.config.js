"use strict";

/** @typedef {import("../../../../").Configuration} Configuration */
/** @typedef {import("../../../../").GeneratorOptionsByModuleTypeKnown} GeneratorOptionsByModuleTypeKnown */

/** @type {Configuration} */
module.exports = {
	target: "web",
	node: { __dirname: false, __filename: false },
	mode: "development",
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
