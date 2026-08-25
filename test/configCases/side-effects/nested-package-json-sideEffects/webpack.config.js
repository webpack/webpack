"use strict";

const path = require("path");

/**
 * @param {...string} segments directory segments below the case's node_modules
 * @returns {string} absolute path of that directory's package.json
 */
const packageJson = (...segments) =>
	path.join(__dirname, "node_modules", ...segments, "package.json");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	module: {
		// factory-level dependencies are dropped for unsafe-cached modules
		unsafeCache: false
	},
	optimization: {
		sideEffects: true,
		usedExports: true,
		providedExports: true,
		concatenateModules: false,
		minimize: false
	},
	plugins: [
		(compiler) => {
			compiler.hooks.afterEmit.tap("Test", (compilation) => {
				// the walk reads ancestors the resolver never looks at, so it reports
				// them itself — otherwise an edited sideEffects would not invalidate
				expect(
					compilation.fileDependencies.has(
						packageJson("unnamed-inner-sef", "dist")
					)
				).toBe(true);
				expect(
					compilation.missingDependencies.has(
						packageJson("missing-mid-sef", "dist")
					)
				).toBe(true);
			});
		}
	]
};
