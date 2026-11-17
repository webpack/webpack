"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	module: {
		rules: [{ mimetype: "text/css", type: "asset/inline" }]
	},
	plugins: [
		{
			/**
			 * @param {import("../../../../types").Compiler} compiler the compiler
			 * @returns {void}
			 */
			apply(compiler) {
				compiler.hooks.compilation.tap("Unchanged", (compilation) => {
					compilation.hooks.renderEmbeddedSource.tap(
						"Unchanged",
						(source) => source
					);
				});
			}
		}
	]
};
