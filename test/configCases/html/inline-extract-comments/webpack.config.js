"use strict";

const fs = require("fs");
const path = require("path");
const MinimizerPlugin = require("minimizer-webpack-plugin");
const webpack = require("../../../../");

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

/** @type {import("../../../../").WebpackPluginInstance} */
const forgetBanner = {
	apply(compiler) {
		compiler.hooks.compilation.tap("Test", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "forget-banner",
					stage:
						compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE
				},
				(assets) => {
					for (const name of Object.keys(assets)) {
						compilation.updateAsset(
							name,
							(source) => source,
							(info) => ({
								...info,
								licenseBanner: undefined
							})
						);
					}
				}
			);
		});
	}
};

/**
 * @param {string | ((licenseFile: string) => string)} banner the banner's text, or a function of the license file's name returning it
 * @returns {import("../../../../").WebpackPluginInstance[]} JS and CSS minimizers writing it
 */
const minimizersWithBanner = (banner) => [
	new MinimizerPlugin({
		test: /\.js$/,
		minify: MinimizerPlugin.terserMinify,
		extractComments: { banner }
	}),
	new MinimizerPlugin({
		test: /\.css$/,
		minify: require.resolve("../../../../lib/css/cssMinify"),
		extractComments: { banner }
	})
];

/** @type {(output: import("../../../../").Configuration["output"], minimizer?: import("../../../../").WebpackPluginInstance[], plugins?: import("../../../../").WebpackPluginInstance[]) => import("../../../../").Configuration} */
const config = (output, minimizer, plugins = []) => ({
	target: ["web", "es2020"],
	mode: "production",
	entry: { page: "./page.html" },
	output: { ...output, pathinfo: false, html: { inline: true } },
	optimization: { minimize: true, minimizer: minimizer || ["..."] },
	experiments: {
		html: true,
		css: true
	},
	plugins: [copyTest, ...plugins]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// The page sits beside its chunks and their license files.
	config({
		filename: "[name].js",
		cssFilename: "[name].css",
		htmlFilename: "page.html"
	}),
	// The page and its chunks sit in different directories, so a banner's path
	// is rewritten for where the page is.
	config({
		filename: "scripts/[name].js",
		cssFilename: "styles/[name].css",
		htmlFilename: "sub/page.html"
	}),
	// The same, with spaces in every path the banner names.
	config({
		filename: "my scripts/my [name].js",
		cssFilename: "my styles/my [name].css",
		htmlFilename: "my pages/page.html"
	}),
	// A banner in other words naming its license file twice, which only the
	// recorded `licenseBanner` finds.
	config(
		{
			filename: "custom scripts/[name].js",
			cssFilename: "custom styles/[name].css",
			htmlFilename: "custom/page.html"
		},
		minimizersWithBanner((file) => `Licenses are in ${file} (copy: ${file})`)
	),
	// A banner naming no license file is left as written.
	config(
		{
			filename: "no-link scripts/[name].js",
			cssFilename: "no-link styles/[name].css",
			htmlFilename: "no-link/page.html"
		},
		minimizersWithBanner("See the licenses")
	),
	// A minimizer recording no `licenseBanner` writes the default wording,
	// which is found by it.
	config(
		{
			filename: "legacy scripts/[name].js",
			cssFilename: "legacy styles/[name].css",
			htmlFilename: "legacy/page.html"
		},
		undefined,
		[forgetBanner]
	)
];
