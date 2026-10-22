"use strict";

const webpack = require("../../../../");

const { Compilation, NormalModuleReplacementPlugin, WebpackError } = webpack;

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true].map((late, index) => ({
	mode: "production",
	target: "web",
	devtool: false,
	cache: false,
	entry: "./index.js",
	output: {
		filename: `main-${index}.js`,
		chunkFilename: `[name]-${index}.js`,
		cssChunkFilename: `[name]-${index}.css`
	},
	experiments: {
		css: true
	},
	module: {
		rules: [{ test: /\.css$/, type: "css/auto" }]
	},
	optimization: {
		splitChunks: false,
		minimize: false,
		concatenateModules: false,
		usedExports: false,
		sideEffects: false,
		moduleIds: "named",
		chunkIds: "named"
	},
	plugins: [
		// "parent" gets x.js late, from the second import of that name.
		...(late
			? [new NormalModuleReplacementPlugin(/parent-b$/, "./parent-b-late")]
			: []),
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					compilation.hooks.processAssets.tap(
						{ name: "Test", stage: Compilation.PROCESS_ASSETS_STAGE_REPORT },
						() => {
							const asset = compilation.getAsset(`child-${index}.css`);
							const css = asset ? asset.source.source().toString() : "";
							// The late build must keep the order of the build without growth.
							if (!/color: blue;[\s\S]*color: red;/.test(css)) {
								compilation.errors.push(
									new WebpackError(`b.css should come before a.css:\n${css}`)
								);
							}
							const child =
								/** @type {import("../../../../").Chunk} */
								(compilation.namedChunks.get("child"));
							const hasX = [
								...compilation.chunkGraph.getChunkModulesIterable(child)
							].some((module) => /[\\/]x\.js$/.test(module.identifier()));
							if (hasX === late) {
								compilation.errors.push(
									new WebpackError(
										`"child" should ${late ? "not " : ""}contain x.js`
									)
								);
							}
						}
					);
				});
			}
		}
	]
}));
