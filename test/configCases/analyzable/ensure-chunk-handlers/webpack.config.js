"use strict";

// `.ei` dispatches the `ensureChunkHandlers` map itself, so the map has to exist for a
// referenced chunk that carries css — and only for source types some handler loads.

const fs = require("fs");
const path = require("path");

// Needle built here so it is not a source string literal the search would find.
const handlers = `${"__webpack_require__"}.f`;

/**
 * @param {number} index position of this config, so it finds its own bundle
 * @param {boolean} needed whether the referenced chunk is loaded through a handler
 * @param {string} entry the entry module
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, needed, entry) => ({
	target: "web",
	mode: "development",
	devtool: false,
	entry,
	experiments: { outputModule: true, css: true },
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
				expect(bundle.includes(handlers)).toBe(needed);
			});
		}
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// An asset rides its own file; nothing fetches it through a handler.
	base(0, false, "./index.js"),
	// A stylesheet is fetched by `.f.css`, which `.ei` has to be able to reach.
	base(1, true, "./index-css.js")
];
