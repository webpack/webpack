"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named"
	},
	plugins: [
		(compiler) => {
			compiler.hooks.thisCompilation.tap(
				"CreateStylesheetAttributesTest",
				(compilation) => {
					const hooks =
						webpack.web.CssLoadingRuntimeModule.getCompilationHooks(
							compilation
						);

					// Mirrors mini-css-extract-plugin's `attributes` plugin option:
					// merge a static map of attributes onto every stylesheet link.
					// Mirrors mini-css-extract-plugin's `linkType` plugin option:
					// pin link.type explicitly (defaulting to text/css).
					hooks.createStylesheet.tap(
						"CreateStylesheetAttributesTest",
						(source) =>
							[
								source,
								'link.setAttribute("id", "main-styles");',
								'link.setAttribute("data-theme", "dark");',
								'link.type = "text/css";'
							].join("\n")
					);
				}
			);
		}
	],
	experiments: {
		css: true
	}
};
