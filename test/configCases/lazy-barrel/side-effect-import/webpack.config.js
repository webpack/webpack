"use strict";

const fs = require("fs");
const path = require("path");
const createLazyBarrelTest = require("../_helpers/createLazyBarrelTest");

module.exports = createLazyBarrelTest(["lib/Button.js"], {
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
			compiler.hooks.done.tap("Test", (stats) => {
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
});
