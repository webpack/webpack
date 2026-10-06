"use strict";

/** @import { Compiler, WebpackError } from "../../../" */

class FileWarningsPlugin {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		const { WebpackError } = compiler.webpack;
		compiler.hooks.thisCompilation.tap("FileWarningsPlugin", (compilation) => {
			compilation.hooks.afterSeal.tap("FileWarningsPlugin", () => {
				for (const file of ["vendor/ignored.js", "kept.css"]) {
					const warning = new WebpackError(`warning about ${file}`);
					warning.file = file;
					compilation.warnings.push(warning);
				}
			});
		});
	}
}

/** @type {import("../../../").Configuration} */
module.exports = {
	entry: "./index.js",
	plugins: [new FileWarningsPlugin()],
	ignoreWarnings: [
		{
			file: "*.js"
		},
		{
			module: /module2\.js\?[34]/
		},
		{
			module: /[13]/,
			message: /homepage/
		},
		/The 'mode' option has not been set/,
		(warning) => {
			const { module } = /** @type {WebpackError} */ (warning);
			if (!module) return false;
			return module.identifier().endsWith("?2");
		}
	]
};
