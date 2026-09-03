"use strict";

const NormalModule = require("../../../../lib/NormalModule");

// What a failing minimizer looks like: the rejection has to surface as this
// module's build error, not as an unhandled one.
class FailingTap {
	/**
	 * @param {import("../../../../lib/Compiler")} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("FailingTap", (compilation) => {
			NormalModule.getCompilationHooks(compilation).processResult.tapPromise(
				"FailingTap",
				async (result, module) => {
					if (!/\.png$/.test(module.resource)) return result;
					throw new Error("re-encoding failed");
				}
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
				type: "asset/resource"
			}
		]
	},
	plugins: [new FailingTap()]
};
