"use strict";

const { RawSource } = require("webpack-sources");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	module: {
		rules: [{ test: /\.svg$/, type: "asset/inline" }]
	},
	plugins: [
		{
			/**
			 * @param {import("../../../../types").Compiler} compiler the compiler
			 * @returns {void}
			 */
			apply(compiler) {
				compiler.hooks.compilation.tap("Minify", (compilation) => {
					compilation.hooks.renderEmbeddedSource.tap(
						"Minify",
						(source, { type }) => {
							if (type !== "svg") return source;
							const text = /** @type {string} */ (source.source());
							return new RawSource(text.replace(/\s+/g, " ").trim());
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
