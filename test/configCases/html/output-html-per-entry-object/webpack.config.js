"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @import { WebpackPluginInstance, Configuration } from "../../../../" */

/** @type {WebpackPluginInstance} */
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

/** @type {Configuration} */
module.exports = {
	entry: {
		a: { import: "./src/a.js", html: { favicon: false } },
		b: { import: "./src/b.js", html: { inject: "head" } },
		c: { import: "./src/c.js", html: { favicon: "./src/icon.svg" } },
		d: "./src/d.js",
		e: { import: "./src/e.js", html: true },
		f: {
			import: "./src/f.js",
			html: { title: "Page f", scriptLoading: "blocking" }
		}
	},
	output: {
		filename: "[name].js",
		html: {
			favicon: true,
			manifest: { name: "Global app" },
			title: "Global title",
			// eslint-disable-next-line unicorn/text-encoding-identifier-case
			meta: { charset: "utf-8", description: "global description" },
			inject: "body"
		}
	},
	experiments: { html: true },
	plugins: [copyTest]
};
