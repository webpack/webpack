"use strict";

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	optimization: { splitChunks: false },
	plugins: [
		(compiler) => {
			let seals = 0;
			compiler.hooks.compilation.tap("AdditionalSealTest", (compilation) => {
				seals = 0;
				/** @type {number | undefined} */
				let endOfMakeCount;
				compilation.hooks.seal.tap("AdditionalSealTest", () => {
					if (endOfMakeCount === undefined) {
						endOfMakeCount = compilation.modules.size;
					}
					seals++;
				});
				compilation.hooks.needAdditionalSeal.tap(
					"AdditionalSealTest",
					() => seals === 1
				);
				compilation.hooks.afterSeal.tap("AdditionalSealTest", () => {
					if (!compiler.watchMode) return;
					const { _incremental } =
						/** @type {import("webpack").Compilation & import("../../../../lib/Compilation")} */ (
							compilation
						);
					expect(_incremental.baseModules.size).toBe(endOfMakeCount);
				});
			});
			compiler.hooks.afterCompile.tap("AdditionalSealTest", () => {
				expect(seals).toBe(2);
			});
		}
	]
};
