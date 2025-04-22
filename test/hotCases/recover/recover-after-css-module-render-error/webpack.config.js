const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: ["./index.js"],
	experiments: {
		css: true
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", compilation => {
					compilation.hooks.additionalTreeRuntimeRequirements.tap(
						"Test",
						(module, set, context) => {
							// To prevent the runtime error `ReferenceError: __webpack_exports__ is not defined`,
							// which occurs because the default `output.library` setting is `commonjs2`,
							// resulting in adding `module.exports = __webpack_exports__;`.
							set.add(webpack.RuntimeGlobals.startup);
							set.add(webpack.RuntimeGlobals.exports);
						}
					);

					webpack.javascript.JavascriptModulesPlugin.getCompilationHooks(
						compilation
					).renderModuleContent.tap("Test", (source, module) => {
						if (module instanceof webpack.css.CssModule && module.hot) {
							const s = module._source.source();
							if (s.includes("Failed")) {
								throw new Error("Failed");
							}
						}
						return source;
					});
				});
			}
		}
	]
};
