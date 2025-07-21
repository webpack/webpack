"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
const common = {
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset"
			}
		]
	},
	experiments: {
		css: true
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
	],
	optimization: {
		runtimeChunk: {
			name: (entrypoint) => `runtime~${entrypoint.name}`
		}
	}
};

/**
 * @param {number} i index
 * @returns {import("../../../../").Configuration | undefined} configuration
 */
const entry = (i) => {
	switch (i % 4) {
		case 0:
			return {
				entry: {
					app: {
						import: "../_images/file.png"
					}
				}
			};
		case 1:
			return {
				entry: {
					app: ["../_images/file.png", "./entry.js"]
				}
			};
		case 2:
			return {
				entry: {
					app: ["../_images/file.png", "./entry.css"]
				}
			};
		case 3:
			return {
				entry: {
					entry1: "../_images/file.png",
					entry2: "./entry.js"
				}
			};
		default:
			break;
	}
};

/**
 * @param {number} i index
 * @returns {import("../../../../").Configuration} configuration
 */
const esm = (i) => ({
	...common,
	...entry(i),
	output: {
		filename: `${i}/[name].mjs`,
		chunkFilename: `${i}/[name].mjs`,
		cssFilename: `${i}/[name].css`,
		cssChunkFilename: `${i}/[name].css`,
		assetModuleFilename: `${i}/[name][ext][query]`,
		module: true
	},
	experiments: {
		outputModule: true,
		css: true
	}
});

/**
 * @param {number} i index
 * @returns {import("../../../../").Configuration} configuration
 */
const node = (i) => ({
	...common,
	...entry(i),
	output: {
		filename: `${i}/[name].js`,
		chunkFilename: `${i}/[name].js`,
		cssFilename: `${i}/[name].css`,
		cssChunkFilename: `${i}/[name].css`,
		assetModuleFilename: `${i}/[name][ext][query]`
	},
	target: "node"
});

/**
 * @param {number} i index
 * @returns {import("../../../../").Configuration} configuration
 */
const web = (i) => ({
	...common,
	...entry(i),
	output: {
		filename: `${i}/[name].js`,
		chunkFilename: `${i}/[name].js`,
		cssFilename: `${i}/[name].css`,
		cssChunkFilename: `${i}/[name].css`,
		assetModuleFilename: `${i}/[name][ext][query]`
	},
	target: "web"
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// web
	...[0, 1, 2, 3].map((i) => web(i)),
	// node
	...[4, 5, 6, 7].map((i) => node(i)),
	// ESM
	...[8, 9, 10, 11].map((i) => esm(i))
];
