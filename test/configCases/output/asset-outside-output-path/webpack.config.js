"use strict";

const fs = require("fs");
const path = require("path");
const { RawSource } = require("webpack-sources");

const SIBLING = "asset-outside-output-path-sibling";

/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: {
		futureDefaults: true
	},
	plugins: [
		(compiler) => {
			compiler.hooks.thisCompilation.tap("Test", (compilation) => {
				compilation.hooks.processAssets.tap("Test", (assets) => {
					assets[`../${SIBLING}/file.txt`] = new RawSource("outside");
					assets["inside/file.txt"] = new RawSource("inside");
				});
			});
			compiler.hooks.afterEmit.tap("Test", (compilation) => {
				const outputPath = compilation.getPath(compiler.outputPath, {});
				expect(
					fs.existsSync(path.join(outputPath, "..", SIBLING, "file.txt"))
				).toBe(false);
				expect(
					fs.readFileSync(path.join(outputPath, "inside/file.txt"), "utf8")
				).toBe("inside");
			});
		}
	]
};
