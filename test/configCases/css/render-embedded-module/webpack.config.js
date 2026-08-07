"use strict";

const { css, sources } = require("../../../../");
const { SourceProcessor } = require("../../../../lib/css/syntax");

/** @typedef {import("../../../../").Compiler} Compiler */

const minifyEmbedded = {
	/**
	 * @param {Compiler} compiler the compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("MinifyEmbedded", (compilation) => {
			const hooks = css.CssModulesPlugin.getCompilationHooks(compilation);
			hooks.renderEmbeddedModule.tap(
				"MinifyEmbedded",
				(source) =>
					new sources.RawSource(
						new SourceProcessor().process(source.source().toString(), {
							minimize: true
						}).code
					)
			);
		});
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	output: {
		pathinfo: false
	},
	module: {
		rules: [
			{
				test: /embedded-style\.css$/,
				type: "css",
				parser: { exportType: "style" }
			},
			{
				test: /embedded-text\.css$/,
				type: "css",
				parser: { exportType: "text" }
			},
			{ test: /plain\.css$/, type: "css" }
		]
	},
	plugins: [minifyEmbedded],
	experiments: {
		css: true
	}
};
