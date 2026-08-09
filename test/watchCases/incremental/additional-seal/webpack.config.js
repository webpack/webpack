"use strict";

/**
 * Asks for one extra seal pass, then checks the invariant the incremental
 * prologue depends on: its base stays the end-of-make module set.
 * @param {import("../../../../").Compiler} compiler compiler
 * @returns {void}
 */
const requestAdditionalSeal = (compiler) => {
	compiler.hooks.compilation.tap("AdditionalSealTest", (compilation) => {
		/** @type {number | undefined} */
		let endOfMakeCount;
		let asked = false;

		compilation.hooks.seal.tap("AdditionalSealTest", () => {
			if (endOfMakeCount === undefined) {
				endOfMakeCount = compilation.modules.size;
			}
		});
		compilation.hooks.needAdditionalSeal.tap("AdditionalSealTest", () => {
			if (asked) return false;
			asked = true;
			return true;
		});
		compilation.hooks.afterSeal.tap("AdditionalSealTest", () => {
			const base =
				/** @type {Set<import("../../../../lib/Module")> | undefined} */
				(compilation._incrementalBaseModules);
			if (base !== undefined && base.size !== endOfMakeCount) {
				compilation.errors.push(
					new Error(
						`incremental base is ${base.size} modules, end of make had ${endOfMakeCount}`
					)
				);
			}
		});
	});
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	// SplitChunksPlugin crashes on a second seal pass independently of this case
	optimization: { splitChunks: false },
	plugins: [requestAdditionalSeal]
};
