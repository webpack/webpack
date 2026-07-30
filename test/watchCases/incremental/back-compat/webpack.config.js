"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		{
			/**
			 * @param {import("../../../../").Compiler} compiler the compiler
			 * @returns {void}
			 */
			apply(compiler) {
				compiler.hooks.compilation.tap("BackCompatCheck", (compilation) => {
					const modules =
						/** @type {EXPECTED_ANY} */
						(compilation.modules);
					// deprecated Array API must stay available on every rebuild
					if (
						typeof modules.map !== "function" ||
						typeof modules.push !== "function"
					) {
						compilation.errors.push(
							new Error("Compilation.modules lost its Array compat methods")
						);
					}
				});
			}
		}
	]
};
