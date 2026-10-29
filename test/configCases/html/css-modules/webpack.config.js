"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

// Bun aborts in its node:vm SourceTextModule.link() and Deno hard-panics
// ("Module not found") on less-loader's `import("less")`; on both load the CJS
// less so it skips the dynamic import.
const lessLoader =
	process.versions.bun || process.versions.deno
		? { loader: "less-loader", options: { implementation: require("less") } }
		: "less-loader";

/**
 * `<style module>` is scoped as a CSS module, and so is a linked `.module.css`;
 * the page's `class` and `id` are rewritten with their names. `lang` still
 * picks the loader through a `mimetype` rule.
 * @type {import("../../../../").Configuration}
 */
module.exports = {
	// A linked stylesheet is emitted for the web; the test runs beside the page.
	target: "web",
	devtool: false,
	entry: {
		page: "./page.html"
	},
	output: {
		filename: "[name].js",
		cssFilename: "[name].css"
	},
	module: {
		generator: {
			"css/module": { localIdentName: "m_[local]" },
			"css/auto": { localIdentName: "a_[local]" }
		},
		rules: [
			{ mimetype: "text/less", use: lessLoader },
			{
				mimetype: "text/x-scss",
				use: path.resolve(__dirname, "variables-loader.js")
			}
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
