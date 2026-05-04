"use strict";

/** @typedef {import("../../../../").GeneratorOptionsByModuleTypeKnown} GeneratorOptionsByModuleTypeKnown */

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				type: "css/module",
				/** @type {GeneratorOptionsByModuleTypeKnown["css/module"]} */
				generator: {
					exportsConvention: (name) => [name, name.toUpperCase()]
				}
			}
		]
	},
	experiments: {
		css: true
	}
};
