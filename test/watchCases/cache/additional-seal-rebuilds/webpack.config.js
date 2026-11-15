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
				compilation.hooks.seal.tap("AdditionalSealTest", () => {
					seals++;
				});
				compilation.hooks.needAdditionalSeal.tap(
					"AdditionalSealTest",
					() => seals === 1
				);
			});
			compiler.hooks.afterCompile.tap("AdditionalSealTest", () => {
				expect(seals).toBe(2);
			});
		}
	]
};
