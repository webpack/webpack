"use strict";

const NormalModule = require("../../../../lib/module/NormalModule");

// A tap that fails with something that is not an Error still has to name the
// module it failed, so the value is wrapped rather than read as one.
class RejectWithString {
	/**
	 * @param {import("../../../../lib/Compiler")} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("RejectWithString", (compilation) => {
			NormalModule.getCompilationHooks(compilation).beforeSnapshot.tap(
				"RejectWithString",
				(module) => {
					if (!/rejected\.js$/.test(module.resource)) return;

					// The literal is the point: a tap may fail with anything.
					// eslint-disable-next-line no-throw-literal
					throw "the tap gave up";
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	optimization: { emitOnErrors: true },
	plugins: [new RejectWithString()]
};
