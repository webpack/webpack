"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: [
			"files",
			{
				from: "files",
				to: "filtered",
				globOptions: { ignore: ["**/overruled.txt", "**/dropped.txt"] }
			}
		]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.thisCompilation.tap("Test", (compilation) => {
				webpack.CopyPlugin.getCompilationHooks(compilation).ignore.tap(
					"Test",
					(copiedPath) => {
						if (copiedPath.endsWith("/secret.txt")) return true;
						// answered ahead of `globOptions.ignore`, so it overrules it
						if (copiedPath.endsWith("/overruled.txt")) return false;
					}
				);
			});
		}
	]
};
