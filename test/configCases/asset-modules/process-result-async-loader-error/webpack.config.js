"use strict";

const NormalModule = require("../../../../lib/NormalModule");

// A loader failure arrives with a result object beside it, so the async hook
// must not run and must not replace the error with its own result.
class PassThroughTap {
	/**
	 * @param {import("../../../../lib/Compiler")} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("PassThroughTap", (compilation) => {
			NormalModule.getCompilationHooks(compilation).processResult.tapPromise(
				"PassThroughTap",
				async (result) => result
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.png$/i,
				type: "asset/resource",
				use: [require.resolve("./failing-loader")]
			}
		]
	},
	plugins: [new PassThroughTap()]
};
