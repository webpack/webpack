"use strict";

const NormalModule = require("../../../../lib/module/NormalModule");

// `beforeParse` is an AsyncSeriesHook, so a tap can fail synchronously or by
// rejecting. Either way the module carries the error and the build goes on.
class FailBeforeParse {
	/**
	 * @param {import("../../../../lib/Compiler")} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("FailBeforeParse", (compilation) => {
			const hooks = NormalModule.getCompilationHooks(compilation);

			hooks.beforeParse.tap("FailBeforeParse", (module) => {
				if (!/thrown\.js$/.test(module.resource)) return;
				throw new Error("the tap threw before the parse");
			});

			hooks.beforeParse.tapPromise("FailBeforeParse", async (module) => {
				if (!/rejected\.js$/.test(module.resource)) return;
				throw new Error("the tap rejected before the parse");
			});
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	optimization: { emitOnErrors: true },
	plugins: [new FailBeforeParse()]
};
