"use strict";

/** @import { Compiler, NormalModule } from "../../../../" */

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /a\.js$/,
				type: "javascript/dynamic",
				sideEffects: true,
				parser: { amd: false, requireContext: false }
			},
			{
				test: /a\.js$/,
				type: "javascript/auto",
				sideEffects: false,
				parser: { requireContext: true, commonjs: false }
			}
		]
	},
	plugins: [
		/**
		 * @param {Compiler} compiler the compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap("merge-settings", (compilation) => {
				compilation.hooks.finishModules.tap("merge-settings", (modules) => {
					const module = /** @type {NormalModule} */ (
						[...modules].find(
							(m) =>
								/** @type {NormalModule} */ (m).resource !== undefined &&
								/** @type {NormalModule} */ (m).resource.endsWith("a.js")
						)
					);
					// An object setting two rules give is merged, the later
					// rule's keys winning; any other setting is the later rule's.
					expect(module.parserOptions).toEqual({
						amd: false,
						requireContext: true,
						commonjs: false
					});
					expect(module.type).toBe("javascript/auto");
					expect(module.factoryMeta).toEqual({ sideEffectFree: true });
				});
			});
		}
	]
};
