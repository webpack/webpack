"use strict";

const { css } = require("../../../../");

/** @typedef {import("../../../../").Compiler} Compiler */

// A throwing tap must surface as a HookWebpackError naming this hook, the way
// a throw in `renderModulePackage` already does.
const throwingTap = {
	/**
	 * @param {Compiler} compiler the compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("ThrowingTap", (compilation) => {
			css.CssModulesPlugin.getCompilationHooks(
				compilation
			).renderEmbeddedModule.tap("ThrowingTap", () => {
				throw new Error("boom");
			});
		});
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		rules: [{ test: /\.css$/, type: "css", parser: { exportType: "style" } }]
	},
	plugins: [throwingTap],
	experiments: {
		css: true
	}
};
