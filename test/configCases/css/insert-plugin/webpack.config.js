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
			compiler.hooks.thisCompilation.tap("InsertPluginTest", (compilation) => {
				const hooks =
					webpack.web.CssLoadingRuntimeModule.getCompilationHooks(compilation);

				hooks.createStylesheet.tap(
					"InsertPluginTest",
					(source) =>
						`${source}\nlink.setAttribute("data-insert-marker", "via-create-stylesheet");`
				);
			});
		}
	],
	experiments: {
		css: true
	}
};
