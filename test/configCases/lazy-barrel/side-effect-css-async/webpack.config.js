"use strict";

const fs = require("node:fs");
const path = require("node:path");

/** @typedef {import("../../../../").NormalModule} NormalModule */

const unusedModule = path.resolve(__dirname, "lib/Unused.js");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	devtool: false,
	externalsPresets: { web: false, webAsync: true },
	experiments: { css: true },
	optimization: { chunkIds: "named", minimize: false },
	plugins: [
		(compiler) => {
			const built = new Set();
			compiler.hooks.thisCompilation.tap("Test", (compilation) => {
				compilation.hooks.buildModule.tap("Test", (module) => {
					built.add(/** @type {NormalModule} */ (module).resource);
				});
			});
			compiler.hooks.done.tap("Test", (stats) => {
				// unused sibling stays deferred (never built); the requested one's
				// `buildModule` is unreliable here since a cached run skips it
				expect(built.has(unusedModule)).toBe(false);

				// read the emitted assets from disk (assets are size-only in `done`)
				const outputPath = /** @type {string} */ (
					stats.compilation.outputOptions.path
				);
				let css = "";
				for (const name of fs.readdirSync(outputPath)) {
					if (name.endsWith(".css")) {
						css += fs.readFileSync(path.join(outputPath, name), "utf8");
					}
				}
				// the used component's CSS must be emitted, the unused one's must not
				expect(css).toMatch(/\.used/);
				expect(css).not.toMatch(/\.unused/);
			});
		}
	]
};
