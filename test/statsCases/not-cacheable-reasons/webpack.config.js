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
				test: /[\\/](index|flagged|child(-dep)?)\.js$/,
				use: require.resolve("./loader")
			},
			{
				test: /[\\/]cleared\.js$/,
				use: require.resolve("./clear-loader")
			},
			{
				test: /[\\/]imported\.js$/,
				use: require.resolve("./import-module-loader")
			}
		]
	},
	plugins: [
		markHostFlaggedPlugin,
		new webpack.DefinePlugin({
			RUNTIME_VALUE: webpack.DefinePlugin.runtimeValue(() => 42, true)
		})
	]
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
