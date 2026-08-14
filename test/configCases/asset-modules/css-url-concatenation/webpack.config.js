"use strict";

// Concatenation makes the asset's only consumer look like javascript, but it is still
// a css url(), so a wrapper built for it would sit in the bundle with no reader.

const fs = require("fs");
const path = require("path");

// Needle built here so it is not a source string literal the search would find.
const wrapper = `${"module"}.exports = ${"__webpack_require__"}.p + `;

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	devtool: false,
	experiments: { css: true },
	optimization: { concatenateModules: true, minimize: false },
	output: {
		filename: "bundle0.js",
		cssFilename: "bundle0.css",
		assetModuleFilename: "[name][ext]"
	},
	module: { rules: [{ test: /\.png$/, type: "asset/resource" }] },
	plugins: [
		(compiler) => {
			compiler.hooks.done.tap("Test", (stats) => {
				const outputPath = /** @type {string} */ (
					stats.compilation.outputOptions.path
				);
				/**
				 * @param {string} name emitted asset name
				 * @returns {string} its content
				 */
				const read = (name) =>
					fs.readFileSync(path.join(outputPath, name), "utf8");
				expect(read("bundle0.css")).toContain("img.png");
				expect(read("bundle0.js")).not.toContain(wrapper);
			});
		}
	]
};
