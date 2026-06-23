"use strict";

// Bun aborts in its node:vm SourceTextModule.link() and Deno hard-panics
// ("Module not found") on less-loader's `import("less")`; on both load the CJS
// less so it skips the dynamic import.
const lessImplementation =
	process.versions.bun || process.versions.deno
		? { implementation: require("less") }
		: undefined;

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		light: { import: "./light.js", layer: "light" },
		dark: { import: "./dark.js", layer: "dark" }
	},
	experiments: {
		css: true
	},
	optimization: {
		runtimeChunk: "single"
	},
	output: {
		filename: "[name].js"
	},
	module: {
		rules: [
			{
				test: /\.less$/i,
				type: "css/auto",
				oneOf: [
					{
						issuerLayer: "light",
						use: [
							{
								loader: "less-loader",
								options: {
									additionalData:
										"@color: white; @property-color: color-light; @property-background: background-light;",
									...lessImplementation
								}
							}
						]
					},
					{
						issuerLayer: "dark",
						use: [
							{
								loader: "less-loader",
								options: {
									additionalData:
										"@color: black; @property-color: color-dark; @property-background: background-dark;",
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
