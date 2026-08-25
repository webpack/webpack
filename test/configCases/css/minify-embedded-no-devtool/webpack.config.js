"use strict";

const { SourceMapSource } = require("webpack-sources");
const { CSS_TYPE } = require("../../../../lib/ModuleSourceTypeConstants");
const cssSyntax = require("../../../../lib/css/syntax");

// A tap that always maps, whatever `devtool` says — webpack must not ship the
// map (and the original sources with it) into a bundle that asked for none.
class AlwaysMappedMinifier {
	/**
	 * @param {import("../../../../lib/Compiler")} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("AlwaysMappedMinifier", (compilation) => {
			compilation.hooks.renderEmbeddedSource.tap(
				"AlwaysMappedMinifier",
				(source, { type, module }) => {
					if (type !== CSS_TYPE) return source;
					const text = /** @type {string} */ (source.source());
					const name = module.identifier();
					const { code, map } = new cssSyntax.SourceProcessor().process(text, {
						mode: "minify",
						source: name,
						content: text
					});
					return code === text
						? source
						: new SourceMapSource(code, name, map, text, undefined, true);
				}
			);
			compilation.hooks.embeddedSourceHash.tap(
				"AlwaysMappedMinifier",
				(module, hash) => hash.update("AlwaysMappedMinifier")
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	experiments: { css: true },
	module: {
		rules: [
			{ test: /\.css$/, type: "css/auto", parser: { exportType: "text" } }
		]
	},
	plugins: [new AlwaysMappedMinifier()]
};
