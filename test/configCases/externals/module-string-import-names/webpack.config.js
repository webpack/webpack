"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true].map((minimize, index) => ({
	mode: "production",
	output: { module: true, filename: `main${index}.mjs` },
	externalsType: "module",
	externals: ["ext-module"],
	optimization: { minimize },
	plugins: [
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap("Test", (compilation) => {
				compilation.hooks.afterProcessAssets.tap("Test", (assets) => {
					const source = /** @type {string} */ (
						assets[`main${index}.mjs`].source()
					);
					// An identifier name needs no ES2022 string form.
					if (source.includes('"café"')) {
						compilation.errors.push(
							new compiler.webpack.WebpackError("café was quoted")
						);
					}
				});
			});
		}
	]
}));
