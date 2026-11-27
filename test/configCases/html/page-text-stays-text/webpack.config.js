"use strict";

const fs = require("fs");
const path = require("path");
const MinimizerPlugin = require("minimizer-webpack-plugin");
const webpack = require("../../../../");
const jsMinify = require("../../../../lib/javascript/jsMinify");

const { htmlMinify } = webpack.html;

/** @type {import("../../../../").WebpackPluginInstance} */
const copyTest = {
	apply(compiler) {
		compiler.hooks.compilation.tap("Test", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "copy-test",
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
				},
				() => {
					compilation.emitAsset(
						"test.js",
						new webpack.sources.RawSource(
							fs.readFileSync(path.resolve(__dirname, "test.js"))
						)
					);
				}
			);
		});
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	devtool: false,
	entry: {
		text: "./text.html",
		sheet: "./sheet.html",
		noscript: "./noscript.html",
		// its chunk is named with a `*`, which no Windows path can hold
		...(process.platform !== "win32" && { banner: "./banner.html" }),
		nested: "./nested.html",
		charset: "./charset.html",
		exported: "./exported.js",
		foreign: "./foreign.html",
		markup: "./markup.html",
		frame: "./frame.html",
		inline: "./inline.html",
		split: "./split.html"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		minimize: true,
		minimizer: [
			new MinimizerPlugin({ test: /\.js$/, minify: jsMinify }),
			new MinimizerPlugin({
				test: /\.css$/,
				minify: require.resolve("../../../../lib/css/cssMinify")
			}),
			new MinimizerPlugin({ test: /\.html$/, minify: htmlMinify })
		],
		// the pages spell these ids in text they keep
		chunkIds: "named"
	},
	experiments: {
		html: true,
		css: true
	},
	plugins: [copyTest]
};
