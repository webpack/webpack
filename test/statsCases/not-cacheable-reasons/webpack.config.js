"use strict";

const webpack = require("../../../");

/** @type {import("../../../").WebpackPluginFunction} */
const markHostFlaggedPlugin = (compiler) => {
	compiler.hooks.compilation.tap("Test", (compilation) => {
		webpack.NormalModule.getCompilationHooks(compilation).beforeLoaders.tap(
			"Test",
			(loaders, module, loaderContext) => {
				if (module.resource.endsWith("host-flagged.js")) {
					loaderContext.cacheable(false);
				}
			}
		);
	});
};

/** @type {import("../../../").Configuration} */
const base = {
	entry: "./index",
	module: {
		rules: [
			{
				test: /[\\/](index|flagged)\.js$/,
				use: require.resolve("./loader")
			}
		]
	},
	plugins: [markHostFlaggedPlugin]
};

/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		...base,
		name: "not-concatenated",
		mode: "none"
	},
	{
		...base,
		name: "concatenated",
		mode: "production",
		// keep the imports alive so modules end up in a ConcatenatedModule
		optimization: { inlineExports: false }
	}
];
