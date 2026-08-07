"use strict";

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../lib/NormalModule")} NormalModule */

class AsyncCodeGenErrorPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("AsyncCodeGenErrorPlugin", (compilation) => {
			compilation.hooks.succeedModule.tap(
				"AsyncCodeGenErrorPlugin",
				(module) => {
					const normalModule = /** @type {NormalModule} */ (
						/** @type {unknown} */ (module)
					);
					if (!normalModule.resource) return;
					if (!normalModule.resource.includes("error-module")) return;

					normalModule.codeGeneration = () =>
						Promise.reject(new Error("async code generation failed"));
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		bundle0: "./index.js",
		error: "./error-module.js"
	},
	output: {
		filename: "[name].js"
	},
	plugins: [new AsyncCodeGenErrorPlugin()],
	optimization: {
		emitOnErrors: true,
		concatenateModules: false,
		inlineExports: false
	}
};
