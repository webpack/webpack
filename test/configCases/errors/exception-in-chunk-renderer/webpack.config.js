"use strict";

/** @import { Compiler, Configuration } from "../../../../" */

class ThrowsExceptionInRender {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("ThrowsException", (compilation) => {
			compilation.mainTemplate.hooks.requireExtensions.tap(
				"ThrowsException",
				() => {
					throw new Error("Test exception");
				}
			);
		});
	}
}

/** @type {Configuration} */
module.exports = {
	plugins: [new ThrowsExceptionInRender()]
};
