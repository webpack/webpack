"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	node: { __dirname: false, __filename: false },
	mode: "development",
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css/module",
				/** @type {import("../../../../").GeneratorOptionsByModuleTypeKnown["css/module"]} */
				generator: { localIdentName: "[name]_[local]" }
			}
		]
	},
	experiments: {
		css: true
	}
};
