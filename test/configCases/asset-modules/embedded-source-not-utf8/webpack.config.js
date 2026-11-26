"use strict";

/** @import { Configuration } from "../../../../" */
/** @import { Compiler } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	module: {
		rules: [{ mimetype: "text/css", type: "asset/inline" }]
	},
	plugins: [
		{
			/**
			 * @param {Compiler} compiler the compiler
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
