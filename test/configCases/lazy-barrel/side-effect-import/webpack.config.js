"use strict";

const fs = require("fs");
const path = require("path");

const barrel = path.resolve(__dirname, "lib/index.js");
const unusedTarget = path.resolve(__dirname, "lib/Button.js");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	devtool: false,
	experiments: { css: true },
	output: {
		cssFilename: "bundle0.css"
	},
	optimization: {
		sideEffects: true,
		providedExports: true,
		usedExports: true,
		moduleIds: "named",
		chunkIds: "named",
		minimize: false,
		concatenateModules: false
	},
	node: {
		__dirname: false,
		__filename: false
	},
	plugins: [
		(compiler) => {
			const created = new Set();
			compiler.hooks.thisCompilation.tap(
				"Test",
				(compilation, { normalModuleFactory }) => {
					normalModuleFactory.hooks.createModule.tap("Test", (createData) => {
						created.add(createData.resource);
					});
				}
			);
			compiler.hooks.done.tap("Test", (stats) => {
				expect(created.has(barrel)).toBe(true);
				expect(created.has(unusedTarget)).toBe(false);

				const css = fs.readFileSync(
					path.join(
						/** @type {string} */ (stats.compilation.outputOptions.path),
						"bundle0.css"
					),
					"utf8"
				);
				expect(css).toMatch(/color:\s*red/);
				expect(css).not.toMatch(/color:\s*blue/);
			});
		}
	]
};
