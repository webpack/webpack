"use strict";

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../lib/NormalModule")} NormalModule */

class AsyncCodeGenPlugin {
	/**
	 * @param {{ wrapGenerator?: boolean }} options options
	 */
	constructor(options = {}) {
		this.wrapGenerator = options.wrapGenerator || false;
	}

	/**
	 * @param {Compiler} compiler the compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("AsyncCodeGenPlugin", (compilation) => {
			compilation.hooks.succeedModule.tap("AsyncCodeGenPlugin", (module) => {
				const normalModule = /** @type {NormalModule} */ (
					/** @type {unknown} */ (module)
				);
				if (!normalModule.resource) return;
				if (!normalModule.resource.includes("async-module")) return;

				if (this.wrapGenerator && normalModule.generator) {
					const origGen = normalModule.generator;
					const wrappedGen = Object.create(origGen);
					/** @type {typeof origGen.generate} */
					wrappedGen.generate = function generate(mod, ctx) {
						const result = origGen.generate(mod, ctx);
						return Promise.resolve(result);
					};
					normalModule.generator = wrappedGen;
				} else {
					const origCodeGen = normalModule.codeGeneration.bind(normalModule);
					normalModule.codeGeneration = (context) =>
						Promise.resolve(origCodeGen(context));
				}
			});
		});
	}
}

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		// Generator.generate() returns Promise<Source>
		// Tests NormalModule promise collection and Compilation async dispatch
		plugins: [new AsyncCodeGenPlugin({ wrapGenerator: true })],
		optimization: { concatenateModules: false }
	},
	{
		// Module.codeGeneration() returns Promise<CodeGenerationResult>
		// Tests Compilation._codeGenerationModule async dispatch
		plugins: [new AsyncCodeGenPlugin({ wrapGenerator: false })],
		optimization: { concatenateModules: false }
	},
	{
		// Inner module's codeGeneration() returns Promise inside ConcatenatedModule
		// Tests ConcatenatedModule._analyseModule async path
		plugins: [new AsyncCodeGenPlugin({ wrapGenerator: false })],
		optimization: { concatenateModules: true }
	}
];
