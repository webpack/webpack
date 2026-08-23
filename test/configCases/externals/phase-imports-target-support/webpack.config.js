"use strict";

const webpack = require("../../../../");

// Neither ESM config sets `output.environment`: the point is that the target
// version alone decides. `import source` is Node >= 24.5 and Deno >= 2.6, and
// `import defer` is Deno >= 2.8 and nothing else, so only the deno build may
// emit it.

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
			"ext-import-source": "import ext-import-source"
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
		// The two builds above emit syntax this runtime cannot parse, so their
		// output is read as text rather than executed.
		name: "runner",
		target: "node",
		entry: { main: "./index.js" },
		output: {
			filename: "[name].js"
		}
	}
];
