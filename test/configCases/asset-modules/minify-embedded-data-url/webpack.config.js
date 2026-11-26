"use strict";

const { RawSource } = require("webpack-sources");

/** @import { WebpackPluginInstance, Configuration } from "../../../../" */
/** @import { Compiler } from "../../../../types.d.ts" */

/** @type {WebpackPluginInstance} */
const minifyJson = {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("Minify", (compilation) => {
			// Stands in for a JSON minifier.
			compilation.hooks.renderEmbeddedSource.tap(
				"Minify",
				(source, { type }) => {
					if (type !== "json") return source;
					const text = /** @type {string} */ (source.source());
					return new RawSource(JSON.stringify(JSON.parse(text)));
				}
			);
			compilation.hooks.embeddedSourceHash.tap("Minify", (_m, hash) =>
				hash.update("Minify")
			);
		});
	}
};

/** @type {Configuration[]} */
module.exports = [
	// ESM output copies the asset's url into `new URL(…, import.meta.url)`, so
	// the module holding that call has to be generated again once it is rendered.
	{
		target: "node",
		devtool: false,
		output: { module: true, filename: "bundle0.mjs" },
		// `./url` is inlined into the entry's module, so the call copying the
		// url is generated as part of the module concatenation made.
		optimization: { concatenateModules: true },
		plugins: [minifyJson]
	},
	// The runtime form reads the url off the asset's own wrapper.
	{
		target: "node",
		devtool: false,
		output: { filename: "bundle1.js" },
		plugins: [minifyJson]
	}
];
