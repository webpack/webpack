"use strict";

// `ensureChunk` dispatches the `ensureChunkHandlers` map, so it exists wherever a
// chunk is loaded on demand — whatever source types that chunk turns out to carry.

const fs = require("fs");
const path = require("path");

// Needle built here so it is not a source string literal the search would find.
const handlers = `${"__webpack_require__"}.f`;

/**
 * @param {number} index position of this config, so it finds its own bundle
 * @param {string} entry the entry module
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, entry) => ({
	target: "web",
	mode: "development",
	devtool: false,
	entry,
	experiments: { css: true },
	output: {
		module: true,
		publicPath: "auto",
		assetModuleFilename: "[name][ext]"
	},
	module: { rules: [{ test: /\.png$/, type: "asset/resource" }] },
	plugins: [
		(compiler) => {
			compiler.hooks.done.tap("Test", (stats) => {
				const outputPath = /** @type {string} */ (
					stats.compilation.outputOptions.path
				);
				const bundle = fs.readFileSync(
					path.join(outputPath, `bundle${index}.mjs`),
					"utf8"
				);
				expect(bundle).toContain(handlers);
			});
		}
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// An asset rides its own file, and the javascript handler still loads the chunk.
	base(0, "./index.js"),
	// A stylesheet is fetched by `.f.css`, alongside the javascript handler.
	base(1, "./index-css.js")
];
