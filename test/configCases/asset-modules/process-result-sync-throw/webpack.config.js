"use strict";

const NormalModule = require("../../../../lib/module/NormalModule");

/** @import Compiler from "../../../../lib/Compiler.js" */
/** @import { Configuration } from "../../../../" */

// The sync hook runs inside the async one's callback, where a throw would be
// an unhandled rejection rather than this module's build error.
class ThrowingSyncTap {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("ThrowingSyncTap", (compilation) => {
			const hooks = NormalModule.getCompilationHooks(compilation);

			hooks.processResult.tapPromise(
				"ThrowingSyncTap",
				async (result) => result
			);
			hooks.processResult.tap("ThrowingSyncTap", (result, module) => {
				if (!/\.png$/.test(module.resource)) return result;
				throw new Error("sync tap threw");
			});
		});
	}
}

/** @type {Configuration} */
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
	plugins: [new ThrowingSyncTap()]
};
