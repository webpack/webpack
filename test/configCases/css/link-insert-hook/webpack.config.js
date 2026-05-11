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

					// Override insertion: place link into <body> instead of
					// the default `document.head.appendChild(link);`.
					hooks.linkInsert.tap(
						"LinkInsertHookTest",
						() =>
							'link.setAttribute("data-link-insert", "custom"); document.body.appendChild(link);'
					);
				}
			);
		}
	],
	experiments: {
		css: true
	}
};
