"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/**
 * @param {string} token token the loader replaces
 * @param {string} value its replacement
 * @returns {{ loader: string, options: { token: string, value: string } }} the loader
 */
const tokenLoader = (token, value) => ({
	loader: path.resolve(__dirname, "token-loader.js"),
	options: { token, value }
});

/**
 * A rule can pick the `<style module>` bodies by their dependency, alone or
 * with a `mimetype` for one `lang`, and its loader runs before the body is
 * scoped, so the names it writes are the page's too.
 * @type {import("../../../../").Configuration}
 */
module.exports = {
	target: "web",
	devtool: false,
	entry: {
		page: "./page.html"
	},
	output: {
		filename: "[name].js"
	},
	module: {
		generator: {
			"css/module": { localIdentName: "m_[local]" }
		},
		rules: [
			// Every `<style module>` body, whatever its `lang`.
			{
				dependency: "html-module-style",
				use: [
					tokenLoader("MODULE", "teal"),
					tokenLoader("GENERATED", ".generated")
				]
			},
			// Only a `<style module lang="scss">` body.
			{
				dependency: "html-module-style",
				mimetype: "text/x-scss",
				use: tokenLoader("SCSS_MODULE", "navy")
			},
			{
				mimetype: "text/x-scss",
				use: path.resolve(__dirname, "variables-loader.js")
			},
			// Only a plain `<style>` body (`html-style` is not a prefix of
			// `html-module-style`); a pattern takes both.
			{
				dependency: "html-style",
				use: tokenLoader("PLAIN", "gray")
			},
			{
				dependency: /^html-(module-)?style$/,
				use: tokenLoader("ANY", "inherit")
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
