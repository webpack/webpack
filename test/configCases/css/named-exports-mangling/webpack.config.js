"use strict";

const webpack = require("../../../../");

/** @typedef {import("../../../../").Configuration} Configuration */
/** @typedef {import("../../../../").ParserOptionsByModuleTypeKnown} ParserOptionsByModuleTypeKnown */
/** @typedef {import("../../../../").GeneratorOptionsByModuleTypeKnown} GeneratorOptionsByModuleTypeKnown */
/** @typedef {NonNullable<GeneratorOptionsByModuleTypeKnown["css/module"]>["exportsConvention"]} ExportsConvention */
/** @typedef {Extract<ExportsConvention, string>} ExportsConventionLiteral */

/** @type {ExportsConventionLiteral[]} */
const conventions = [
	"as-is",
	"camel-case",
	"camel-case-only",
	"dashes",
	"dashes-only"
];

/**
 * @param {boolean} namedExports value of parser.namedExports
 * @returns {Configuration["module"]} module config
 */
const makeModule = (namedExports) => ({
	rules: [
		{
			test: /\.module\.css$/,
			type: "css/module",
			oneOf: conventions.map((convention) => ({
				resourceQuery: new RegExp(`\\?${convention}$`),
				/** @type {ParserOptionsByModuleTypeKnown["css/module"]} */
				parser: { namedExports },
				/** @type {GeneratorOptionsByModuleTypeKnown["css/module"]} */
				generator: { exportsConvention: convention }
			}))
		}
	]
});

/**
 * @param {{ namedExports: boolean, outputModule: boolean }} options matrix cell
 * @returns {Configuration} a single config
 */
const makeConfig = ({ namedExports, outputModule }) => {
	/** @type {Configuration} */
	const config = {
		mode: "production",
		target: "web",
		devtool: false,
		optimization: {
			chunkIds: "named",
			moduleIds: "named",
			// Make concatenation explicit (default in production, repeated for clarity)
			concatenateModules: true,
			// Make JS export mangling explicit
			mangleExports: "deterministic",
			usedExports: true,
			providedExports: true
		},
		module: makeModule(namedExports),
		plugins: [
			new webpack.DefinePlugin({
				"process.env.NAMED_EXPORTS": JSON.stringify(namedExports),
				"process.env.OUTPUT_MODULE": JSON.stringify(outputModule)
			})
		],
		// re-exports.js does named re-exports from CSS modules; when
		// namedExports is false those modules expose only `default`, so
		// the named re-exports legitimately warn. We expect this and
		// ignore the warnings rather than removing the re-exports.
		ignoreWarnings: namedExports
			? undefined
			: [/Should not import the named export .* from default-exporting module/],
		experiments: { css: true }
	};
	if (outputModule) {
		config.output = { module: true, chunkFormat: "module" };
		/** @type {NonNullable<Configuration["experiments"]>} */
		(config.experiments).outputModule = true;
	}
	return config;
};

module.exports = [
	makeConfig({ namedExports: true, outputModule: false }),
	makeConfig({ namedExports: false, outputModule: false }),
	makeConfig({ namedExports: true, outputModule: true }),
	makeConfig({ namedExports: false, outputModule: true })
];
