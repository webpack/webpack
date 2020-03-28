const { CachedSource } = require("webpack-sources");
const { AsyncWebAssemblyModulesPlugin } = require("../../../../").wasm;

/** @typedef {import("../../../../lib/Compilation")} Compilation */

module.exports = {
	module: {
		rules: [
			{
				test: /\.wat$/,
				loader: "wast-loader",
				type: "webassembly/async"
			}
		]
	},
	experiments: {
		asyncWebAssembly: true,
		importAwait: true
	},
	plugins: [
		function () {
			this.hooks.compilation.tap(
				"Test",
				/**
				 * @param {Compilation} compilation Compilation
				 * @returns {void}
				 */
				compilation => {
					AsyncWebAssemblyModulesPlugin.getCompilationHooks(
						compilation
					).renderModuleContent.tap("Test", source => {
						// this is important to make each returned value a new instance
						return new CachedSource(source);
					});
				}
			);
		}
	]
};
