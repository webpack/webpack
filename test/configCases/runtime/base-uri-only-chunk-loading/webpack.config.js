"use strict";

// A `new URL(…, import.meta.url)` pulls in the chunk loader for `.b` alone, and
// nothing installs a chunk there — so the table and its two helpers have no reader.

const fs = require("fs");
const path = require("path");

// Needles built here so they are not source string literals the search would find.
const needles = [
	`${"installed"}Chunks`,
	`${"__webpack_require__"}.m`,
	`${"__webpack_require__"}.o`
];

/**
 * @param {number} index position of this config, so it finds its own bundle
 * @param {import("../../../../").Configuration} extra per-case overrides
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, extra) => {
	const filename = `bundle${index}.${
		extra.output && extra.output.module ? "mjs" : "js"
	}`;
	return {
		mode: "development",
		devtool: false,
		...extra,
		output: {
			assetModuleFilename: "[name][ext]",
			...extra.output,
			filename
		},
		module: { rules: [{ test: /\.png$/, type: "asset/resource" }] },
		plugins: [
			(compiler) => {
				compiler.hooks.done.tap("Test", (stats) => {
					const outputPath = /** @type {string} */ (
						stats.compilation.outputOptions.path
					);
					const source = fs.readFileSync(
						path.join(outputPath, filename),
						"utf8"
					);
					for (const needle of needles) expect(source).not.toContain(needle);
				});
			}
		]
	};
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	base(0, { target: "web" }),
	base(1, { target: "webworker" }),
	base(2, { target: "node" }),
	base(3, { target: "async-node" }),
	base(4, {
		target: "node",
		experiments: { outputModule: true },
		output: { module: true, chunkFormat: "module", library: { type: "module" } }
	})
];
