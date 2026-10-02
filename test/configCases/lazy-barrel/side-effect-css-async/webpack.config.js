"use strict";

const fs = require("fs");
const path = require("path");
const createLazyBarrelTest = require("../_helpers/createLazyBarrelTest");

// unused sibling stays deferred (never built)
module.exports = createLazyBarrelTest(["lib/Unused.js"], {
	mode: "production",
	target: "web",
	devtool: false,
	externalsPresets: { web: false, webAsync: true },
	experiments: { css: true },
	optimization: { chunkIds: "named", minimize: false },
	plugins: [
		(compiler) => {
			compiler.hooks.done.tap("Test", (stats) => {
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
});
