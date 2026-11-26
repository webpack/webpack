"use strict";

const fs = require("fs");
const path = require("path");
const { RawSource } = require("webpack-sources");

/** @import { Configuration } from "../../../../" */

const SIBLING = "asset-outside-unset-sibling";

/** @type {Configuration} */
module.exports = {
	plugins: [
		(compiler) => {
			compiler.hooks.thisCompilation.tap("Test", (compilation) => {
				compilation.hooks.processAssets.tap("Test", (assets) => {
					assets[`../${SIBLING}/file.txt`] = new RawSource("outside");
				});
			});
			compiler.hooks.afterEmit.tap("Test", (compilation) => {
				const outputPath = compilation.getPath(compiler.outputPath, {});
				expect(
					fs.readFileSync(
						path.join(outputPath, "..", SIBLING, "file.txt"),
						"utf8"
					)
				).toBe("outside");
			});
		}
	]
};
