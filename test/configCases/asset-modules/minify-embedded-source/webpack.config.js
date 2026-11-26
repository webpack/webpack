"use strict";

const { RawSource } = require("webpack-sources");

/** @import { Configuration } from "../../../../" */
/** @import { Compiler } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	module: {
		rules: [
			{ test: /\.svg$/, type: "asset/source" },
			{ test: /\.txt$/, type: "asset/source" }
		]
	},
	plugins: [
		{
			/**
			 * @param {Compiler} compiler the compiler
			 * @returns {void}
			 */
			apply(compiler) {
				compiler.hooks.compilation.tap("Minify", (compilation) => {
					// Stands in for an SVG minifier: collapsing runs of whitespace shows
					// the text was reached before it was embedded.
					compilation.hooks.renderEmbeddedSource.tap(
						"Minify",
						(source, { type }) => {
							if (type !== "svg") return source;
							const text = /** @type {string} */ (source.source());
							// Handed back Buffer-backed, as a tap may: the export must still be
							// the text, not the Buffer.
							return new RawSource(
								Buffer.from(text.replace(/\s+/g, " ").trim())
							);
						}
					);
					compilation.hooks.embeddedSourceHash.tap("Minify", (_m, hash) =>
						hash.update("Minify")
					);
				});
			}
		}
	]
};
