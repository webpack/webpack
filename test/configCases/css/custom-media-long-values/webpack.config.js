"use strict";

const path = require("path");

/** @import { Configuration, Module } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	node: { __dirname: false },
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [path.resolve(__dirname, "loader.js")]
			}
		]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("Test", (compilation) => {
				/** @type {Map<Module, number>} */
				const starts = new Map();
				/** @type {Record<string, number>} */
				const times = {};
				compilation.hooks.buildModule.tap("Test", (module) => {
					starts.set(module, Date.now());
				});
				compilation.hooks.succeedModule.tap("Test", (module) => {
					const match = /(\w+)\.css$/.exec(module.identifier());
					if (match) {
						times[match[1]] =
							Date.now() - /** @type {number} */ (starts.get(module));
					}
				});
				compilation.hooks.processAssets.tap("Test", () => {
					compilation.emitAsset(
						"build-times.json",
						new compiler.webpack.sources.RawSource(JSON.stringify(times))
					);
				});
			});
		}
	],
	experiments: { css: true }
};
