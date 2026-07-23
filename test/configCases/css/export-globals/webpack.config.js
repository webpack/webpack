"use strict";

/** @typedef {import("../../../../").Configuration} Configuration */
/** @typedef {import("../../../../").ParserOptionsByModuleTypeKnown} ParserOptionsByModuleTypeKnown */
/** @typedef {import("../../../../").GeneratorOptionsByModuleTypeKnown} GeneratorOptionsByModuleTypeKnown */

/** @type {GeneratorOptionsByModuleTypeKnown["css/module"]} */
const scoped = { localIdentName: "scoped-[local]" };

const common = {
	target: "web",
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				type: "css/module",
				oneOf: [
					{
						resourceQuery: /\?globals-camel$/,
						/** @type {ParserOptionsByModuleTypeKnown["css/module"]} */
						parser: { exportGlobals: true },
						generator: { ...scoped, exportsConvention: "camel-case" }
					},
					{
						resourceQuery: /\?globals$/,
						/** @type {ParserOptionsByModuleTypeKnown["css/module"]} */
						parser: { exportGlobals: true },
						generator: scoped
					},
					{
						generator: scoped
					}
				]
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
