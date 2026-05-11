"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	plugins: [
		(compiler) => {
			compiler.hooks.thisCompilation.tap(
				"LinkInsertHookHmrTest",
				(compilation) => {
					const hooks =
						webpack.web.CssLoadingRuntimeModule.getCompilationHooks(
							compilation
						);

					// Tag the link from inside the hook so we can verify the
					// hook's source is what the HMR runtime actually executes.
					hooks.linkInsert.tap(
						"LinkInsertHookHmrTest",
						(source) =>
							`link.setAttribute("data-link-insert", "custom");\n${source}`
					);
				}
			);
		}
	],
	experiments: {
		css: true
	}
};
