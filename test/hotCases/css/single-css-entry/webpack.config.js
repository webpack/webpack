const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	entry: ["./index.js", "./index.css"],
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
				});
			}
		}
	]
};
