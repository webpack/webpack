"use strict";

const webpack = require("../../../../");

// No config sets `output.environment`: the target version alone decides. `import
// source` is Node >= 24.5 / Deno >= 2.6, `import defer` is Deno >= 2.8 and nothing else.

/**
 * Exposes the environment webpack resolved, which is settled after plugins apply.
 * @param {import("../../../../").Compiler} compiler the compiler
 * @returns {void}
 */
const defineResolvedEnvironment = (compiler) => {
	compiler.hooks.afterEnvironment.tap("Test", () => {
		const environment = compiler.options.output.environment;
		new webpack.DefinePlugin({
			__DEFER_IMPORT__: JSON.stringify(environment.deferImport),
			__SOURCE_IMPORT__: JSON.stringify(environment.sourceImport)
		}).apply(compiler);
	});
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "deno",
		target: "deno2.8",
		entry: { main: "./deno.js", phases: "./phases.js" },
		output: {
			filename: "deno-[name].mjs",
			module: true
		},
		optimization: { concatenateModules: false },
		experiments: {
			outputModule: true,
			deferImport: true,
			sourceImport: true
		},
		externals: {
			"ext-defer": "module ext-defer",
			"ext-source": "module ext-source",
			"ext-import-defer": "import ext-import-defer",
			"ext-import-source": "import ext-import-source",
			"ext-both": "module ext-both"
		},
		plugins: [defineResolvedEnvironment]
	},
	{
		name: "node",
		target: "node24.5",
		entry: { main: "./node.js", phases: "./source-only.js" },
		output: {
			filename: "node-[name].mjs",
			module: true
		},
		optimization: { concatenateModules: false },
		experiments: {
			outputModule: true,
			sourceImport: true
		},
		externals: {
			"ext-source": "module ext-source"
		},
		plugins: [defineResolvedEnvironment]
	},
	{
		name: "deno-concat",
		target: "deno2.8",
		entry: { main: "./concat.js", phases: "./unused-source.js" },
		output: {
			filename: "concat-[name].mjs",
			module: true
		},
		optimization: { concatenateModules: true, usedExports: true },
		experiments: {
			outputModule: true,
			deferImport: true,
			sourceImport: true
		},
		externals: {
			"ext-defer": "module ext-defer",
			"ext-source": "module ext-source",
			"ext-both": "module ext-both"
		},
		plugins: [defineResolvedEnvironment]
	},
	{
		// The builds above emit syntax this runtime cannot parse, so their
		// output is read as text rather than executed.
		name: "runner",
		target: "node",
		entry: { main: "./index.js" },
		output: {
			filename: "[name].js"
		}
	}
];
