"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/**
 * @param {0 | 1 | 2} i index
 * @returns {{ main: string[] }} entry
 */
const entry = (i) => {
	switch (i) {
		case 0:
			return {
				main: ["./main.css"]
			};
		case 1:
			return {
				main: ["./main1.js"]
			};
		case 2:
			return {
				main: ["./main2.js"]
			};
	}
};

/**
 * @param {0 | 1 | 2} i param
 * @returns {import("../../../../").Configuration} return
 */
const common = (i) => ({
	entry: {
		...entry(i)
	},
	target: "web",
	devtool: false,
	experiments: {
		css: true
	},
	output: {
		filename: `${i}/[name].js`,
		chunkFilename: `${i}/[name].js`,
		cssFilename: `${i}/[name].css`,
		cssChunkFilename: `${i}/[name].css`
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					compilation.hooks.processAssets.tap(
						{
							name: "copy-webpack-plugin",
							stage:
								compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
						},
						() => {
							const data = fs.readFileSync(
								path.resolve(__dirname, "./test.js")
							);

							compilation.emitAsset(
								"test.js",
								new webpack.sources.RawSource(data)
							);
						}
					);
				});
			}
		}
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = /** @type {(0 | 1 | 2)[]} */ ([0, 1]).map((i) => common(i));
