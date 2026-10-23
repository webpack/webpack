"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	"web",
	"node",
	"webworker",
	"electron-main",
	"bun",
	"deno",
	"universal"
]
	.map((target) =>
		[false, true].map((relative) => ({
			target,
			entry: {
				main: {
					import: "./index.js",
					baseUri: "https://example.com/base/"
				}
			},
			output: {
				assetModuleFilename: "[name][ext][query][fragment]",
				publicPath: "assets/",
				module: target === "deno" || target === "universal"
			},
			experiments: { outputModule: true },
			module: {
				parser: {
					javascript: { url: relative ? "relative" : true }
				}
			}
		}))
	)
	.reduce((configs, variants) => [...configs, ...variants], []);
