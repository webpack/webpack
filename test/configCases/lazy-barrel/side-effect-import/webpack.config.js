"use strict";

const fs = require("fs");
const path = require("path");

/** @typedef {import("../../../../").NormalModule} NormalModule */

const lazyModules = new Set(
	["lib/Button.js"].map((file) => path.resolve(__dirname, file))
);

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
			compiler.hooks.thisCompilation.tap("Test", (compilation) => {
				compilation.hooks.buildModule.tap("Test", (module) => {
					created.add(/** @type {NormalModule} */ (module).resource);
				});
			});
			compiler.hooks.done.tap("Test", (stats) => {
				for (const module of lazyModules) {
					expect(created.has(module)).toBe(false);
				}

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
