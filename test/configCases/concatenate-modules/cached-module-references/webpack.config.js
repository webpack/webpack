"use strict";

/** @import { Module } from "../../../../" */

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	optimization: {
		concatenateModules: { commonjs: true },
		inlineExports: false,
		minimize: false
	},
	plugins: [
		(compiler) => {
			const { ConcatenationScope } = compiler.webpack.optimize;
			compiler.hooks.compilation.tap("CountModuleReferences", (compilation) => {
				compilation.hooks.beforeCodeGeneration.tap(
					"CountModuleReferences",
					() => {
						for (const module of compilation.modules) {
							if (!module.is("concatenated")) continue;
							const codeGeneration = module.codeGeneration;
							/**
							 * @param {Parameters<Module["codeGeneration"]>[0]} context generation context
							 * @returns {ReturnType<Module["codeGeneration"]>} generated code
							 */
							module.codeGeneration = (context) => {
								/** @type {Set<string>} */
								const parsedNames = new Set();
								const matchModuleReference =
									ConcatenationScope.matchModuleReference;
								/**
								 * @param {string} name reference identifier
								 * @returns {ReturnType<typeof matchModuleReference>} parsed reference
								 */
								ConcatenationScope.matchModuleReference = (name) => {
									expect(parsedNames.has(name)).toBe(false);
									parsedNames.add(name);
									const match = matchModuleReference(name);
									if (match) {
										Object.freeze(match.ids);
										Object.freeze(match);
									}
									return match;
								};
								try {
									const result = codeGeneration.call(module, context);
									expect(parsedNames.size).toBeGreaterThan(0);
									return result;
								} finally {
									ConcatenationScope.matchModuleReference =
										matchModuleReference;
								}
							};
						}
					}
				);
			});
		}
	]
};
