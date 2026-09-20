"use strict";

const PLUGIN_NAME = "InjectFreeNamePlugin";

// A render hook may add free names the code generation data never reported, so
// the entry-IIFE rename has to analyse the source the hooks left behind.
/** @type {import("../../../../").WebpackPluginInstance} */
const injectFreeNamePlugin = {
	apply(compiler) {
		const { ConcatSource } = compiler.webpack.sources;
		const { JavascriptModulesPlugin } = compiler.webpack.javascript;

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);

			hooks.renderModuleContent.tap(PLUGIN_NAME, (source, module) => {
				if (!module.identifier().includes("injected.js")) return source;

				return new ConcatSource(
					source,
					"\nglobalThis.injectedTypeOfValue = typeof value;\n"
				);
			});
		});
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["es2020", "node"],
	output: {
		module: true
	},
	optimization: {
		concatenateModules: true,
		avoidEntryIife: true
	},
	plugins: [injectFreeNamePlugin]
};
