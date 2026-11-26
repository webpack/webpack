"use strict";

/** @import { Configuration, GeneratorOptionsByModuleTypeKnown } from "../../../../" */

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
				generator: { localIdentName: "[local]_x" }
			}
		]
	},
	experiments: {
		css: true
	}
};
