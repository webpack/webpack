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
				"LinkInsertHookTest",
				(compilation) => {
					const hooks =
						webpack.web.CssLoadingRuntimeModule.getCompilationHooks(
							compilation
						);

					// Override insertion: place link as first child of <head>
					// (instead of the default appendChild).
					hooks.linkInsert.tap(
						"LinkInsertHookTest",
						() =>
							'link.setAttribute("data-link-insert", "custom"); document.head.insertBefore(link, document.head.firstChild);'
					);
				}
			);
		}
	],
	experiments: {
		css: true
	}
};
