"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/**
 * What a page's CSS modules rewrite besides `class` and `id`: named modules
 * (`card.btn`), id references, `url(#id)`, SMIL timings, attributes an option
 * adds, and a page that finds its names again when generating.
 * @type {import("../../../../").Configuration}
 */
module.exports = {
	mode: "development",
	target: "web",
	devtool: false,
	entry: {
		page: "./page.html",
		rescan: "./rescan.html",
		fragment: "./fragment.html"
	},
	output: {
		filename: "[name].js",
		cssFilename: "[name].css"
	},
	module: {
		parser: {
			html: {
				cssModules: {
					attributes: {
						"data-target": "id",
						"data-classes": "class",
						"data-link": "fragment",
						"data-refs": "ids",
						"data-paint": "url"
					}
				}
			}
		},
		generator: {
			"css/module": { localIdentName: "[id]-[local]" },
			"css/auto": { localIdentName: "[id]-[local]" }
		},
		rules: [
			// A CSS module by its rule alone.
			{ test: /by-rule\.css$/, type: "css/module" },
			// A page parsed as the inner HTML of a `<tbody>`.
			{ test: /fragment\.html$/, parser: { as: "tbody" } }
		]
	},
	experiments: {
		html: true,
		css: true
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					compilation.hooks.processAssets.tap(
						{
							name: "copy-test",
							stage:
								compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
						},
						() => {
							const data = fs.readFileSync(path.resolve(__dirname, "test.js"));
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
};
