"use strict";

const NormalModule = require("../../../../lib/NormalModule");

// A tap that rejects with something that is not an Error still has to name the
// module it failed, so the value is wrapped rather than reported bare.
class RejectWithString {
	/**
	 * @param {import("../../../../lib/Compiler")} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("RejectWithString", (compilation) => {
			NormalModule.getCompilationHooks(compilation).processResult.tapPromise(
				"RejectWithString",
				async (result, module) => {
					if (!/\.png$/.test(module.resource)) return result;

					// The literal is the point: a tap may reject with anything.
					// eslint-disable-next-line no-throw-literal
					throw "re-encoding gave up";
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
	plugins: [new RejectWithString()]
};
