"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	node: { __dirname: false, __filename: false },
	mode: "development",
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				type: "css/module",
				/** @type {import("../../../../").GeneratorOptionsByModuleTypeKnown["css/module"]} */
				generator: { localIdentName: "_[local]" }
			}
		]
	},
	experiments: {
		css: true
	}
};
