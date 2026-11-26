"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	plugins: [
		(compiler) => {
			compiler.hooks.thisCompilation.tap(
				"HotLinkAttributesTest",
				(compilation) => {
					webpack.web.CssLoadingRuntimeModule.getCompilationHooks(
						compilation
					).createStylesheet.tap(
						"HotLinkAttributesTest",
						(source) =>
							`${source}\nlink.setAttribute("data-hook", "current");\nlink.setAttribute("integrity", "sha256-current");`
					);
				}
			);
		}
	],
	experiments: {
		css: true
	}
};
