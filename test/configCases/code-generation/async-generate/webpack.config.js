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

/**
 * @param {object} options options
 * @param {boolean=} options.wrapGenerator wrap Generator.generate
 * @param {boolean=} options.concatenateModules enable concatenation
 * @param {string=} options.name config name
 * @returns {import("../../../../").Configuration} webpack configuration
 */
function createConfig({ wrapGenerator, concatenateModules, name }) {
	return {
		name,
		target: "web",
		mode: "development",
		devtool: false,
		plugins: [new AsyncCodeGenPlugin({ wrapGenerator })],
		optimization: {
			concatenateModules: Boolean(concatenateModules),
			usedExports: false
		},
		module: {
			rules: [
				{
					test: /\.css$/,
					type: "css/module",
					parser: {
						exportType: "text"
					}
				}
			]
		},
		experiments: {
			css: true
		}
	};
}

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	createConfig({
		name: "async-generate",
		wrapGenerator: true,
		concatenateModules: false
	}),
	createConfig({
		name: "async-codeGeneration",
		wrapGenerator: false,
		concatenateModules: false
	}),
	createConfig({
		name: "async-generate-css-concat",
		wrapGenerator: true,
		concatenateModules: true
	})
];
