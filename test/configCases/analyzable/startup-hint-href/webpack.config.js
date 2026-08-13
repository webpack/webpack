"use strict";

// The `<link>` hrefs name the same files the call sites do, so neither the public
// path nor the chunk filename map is pulled into the bundle to rebuild them.

const fs = require("fs");
const path = require("path");

// Needles built here so they are not source string literals the search would find.
const publicPath = `${"__webpack_require__"}.p`;
const chunkFilename = `${"__webpack_require__"}.u`;

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		publicPath: "auto",
		filename: "bundle0.mjs",
		assetModuleFilename: "[name][ext]"
	},
	module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] },
	plugins: [
		(compiler) => {
			compiler.hooks.done.tap("Test", (stats) => {
				const outputPath = /** @type {string} */ (
					stats.compilation.outputOptions.path
				);
				const source = fs.readFileSync(
					path.join(outputPath, "bundle0.mjs"),
					"utf8"
				);
				expect(source).toContain(
					'.LA(new URL("./a.txt", import.meta.url).href, "fetch"'
				);
				expect(source).not.toContain(publicPath);
				expect(source).not.toContain(chunkFilename);
			});
		}
	]
};
