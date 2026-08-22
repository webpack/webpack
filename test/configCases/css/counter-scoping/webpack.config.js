"use strict";

/**
 * @import {
 * 	Configuration,
 * 	GeneratorOptionsByModuleTypeKnown,
 * 	ParserOptionsByModuleTypeKnown
 * } from "../../../../"
 */

/**
 * @param {ParserOptionsByModuleTypeKnown["css/module"]=} parser parser options
 * @returns {Configuration} webpack config
 */
const common = (parser) => ({
	target: "web",
	node: { __dirname: false, __filename: false },
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				type: "css/module",
				parser,
				/** @type {GeneratorOptionsByModuleTypeKnown["css/module"]} */
				generator: { localIdentName: "s-[local]" }
			}
		]
	},
	experiments: { css: true }
});

/** @type {Configuration[]} */
module.exports = [
	{ ...common(), mode: "development" },
	{ ...common(), mode: "production", devtool: false },
	{ ...common({ customIdents: false }), mode: "development" }
];
