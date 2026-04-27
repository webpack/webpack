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
		// Two entry files: only one form of static import works per
		// namedExports value (named imports vs default import), so we
		// switch the entry rather than have one file with imports that
		// fail to resolve in the other config.
		entry: namedExports ? "./index-named.js" : "./index-default.js",
		mode: "production",
		// target: node so the test code can `require("fs")` to inspect the
		// emitted bundle without needing externals plumbing.
		target: "node",
		devtool: false,
		node: {
			__dirname: false,
			__filename: false
		},
		optimization: {
			chunkIds: "named",
			moduleIds: "named",
			// Concatenation must be on for CSS modules to actually inline
			// their exports into the parent scope; without it, CSS modules
			// stay as separate runtime modules with full-string export keys.
			concatenateModules: true,
			// Mangle JS export identifiers deterministically so we can
			// assert mangling actually happened in the bundle source.
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
