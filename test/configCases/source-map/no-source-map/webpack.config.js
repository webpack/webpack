"use strict";

/** @typedef {import("../../../../").WebpackPluginFunction} WebpackPluginFunction */

/** @type {WebpackPluginFunction[]} */
const plugins = [
	(compiler) => {
		compiler.hooks.emit.tap("Test", (compilation) => {
			for (const asset of compilation.getAssets()) {
				const result = asset.source.sourceAndMap();
				try {
					expect(result.map).toBeNull();
				} catch (_err) {
					const err = /** @type {Error} */ (_err);
					err.message += `\nfor asset ${asset.name}`;
					throw err;
				}
			}
		});
	}
];

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		mode: "development",
		devtool: false,
		plugins
	},
	{
		mode: "production",
		devtool: false,
		plugins
	},
	{
		mode: "production",
		devtool: false,
		optimization: {
			minimize: true
		},
		plugins
	}
];
