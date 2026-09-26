"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: ["files"]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.thisCompilation.tap("Test", (compilation) => {
				webpack.CopyPlugin.getCompilationHooks(compilation).ignore.tap(
					"Test",
					(copiedPath) => {
						if (copiedPath.endsWith("/secret.txt")) return true;
					}
				);
			});
		}
	]
};
