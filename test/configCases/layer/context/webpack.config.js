"use strict";

const MiniCssExtractPlugin = require("mini-css-extract-plugin");

// Bun aborts in its node:vm SourceTextModule.link() and Deno hard-panics
// ("Module not found") on less-loader's `import("less")`; on both load the CJS
// less so it skips the dynamic import.
const lessImplementation =
	process.versions.bun || process.versions.deno
		? { implementation: require("less") }
		: undefined;

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		light: { import: "./light.js", layer: "light" },
		dark: { import: "./dark.js", layer: "dark" }
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: "[name].css"
		})
	],
	module: {
		rules: [
			{
				test: /\.less$/i,
				oneOf: [
					{
						issuerLayer: "light",
						use: [
							MiniCssExtractPlugin.loader,
							"css-loader",
							{
								loader: "less-loader",
								options: {
									additionalData: "@color: white;",
									...lessImplementation
								}
							}
						]
					},
					{
						issuerLayer: "dark",
						use: [
							MiniCssExtractPlugin.loader,
							"css-loader",
							{
								loader: "less-loader",
								options: {
									additionalData: "@color: black;",
									...lessImplementation
								}
							}
						]
					}
				]
			}
		]
	}
};
