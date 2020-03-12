/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleNotFoundError = require("../ModuleNotFoundError");
const RuntimeGlobals = require("../RuntimeGlobals");
const OverridableModule = require("./OverridableModule");
const OverridableOriginalDependency = require("./OverridableOriginalDependency");
const OverridableOriginalModuleFactory = require("./OverridableOriginalModuleFactory");
const OverridablesRuntimeModule = require("./OverridablesRuntimeModule");
const parseOptions = require("./parseOptions");
const {
	toConstantDependency,
	evaluateToString
} = require("../javascript/JavascriptParserHelpers");

/** @typedef {import("../Compiler")} Compiler */

class OverridablesPlugin {
	constructor(options) {
		this.overridables = parseOptions(options);
	}
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"OverridablesPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					OverridableOriginalDependency,
					new OverridableOriginalModuleFactory()
				);

				const resolvedOverridables = new Map();
				const promise = Promise.all(
					this.overridables.map(([key, request]) => {
						const resolver = compilation.resolverFactory.get("normal");
						return new Promise((resolve, reject) => {
							resolver.resolve(
								{},
								compiler.context,
								request,
								{},
								(err, result) => {
									if (err) {
										compilation.errors.push(
											new ModuleNotFoundError(null, err, {
												name: `overridable ${key}`
											})
										);
										return resolve();
									}
									resolvedOverridables.set(result, key);
									resolve();
								}
							);
						});
					})
				);
				normalModuleFactory.hooks.afterResolve.tapAsync(
					"OverridablesPlugin",
					(resolveData, callback) => {
						// wait for resolving to be complete
						promise.then(() => callback());
					}
				);
				normalModuleFactory.hooks.module.tap(
					"OverridablesPlugin",
					(module, createData) => {
						const key = resolvedOverridables.get(createData.resource);
						if (key !== undefined) return new OverridableModule(module, key);
					}
				);
				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.ensureChunkHandlers)
					.tap("OverridablesPlugin", (chunk, set) => {
						set.add(RuntimeGlobals.module);
						set.add(RuntimeGlobals.moduleFactories);
						set.add(RuntimeGlobals.hasOwnProperty);
						compilation.addRuntimeModule(
							chunk,
							new OverridablesRuntimeModule()
						);
					});
				const handler = parser => {
					parser.hooks.expression
						.for("__webpack_override__")
						.tap(
							"OverridablesPlugin",
							toConstantDependency(
								parser,
								`Object.assign.bind(Object, ${RuntimeGlobals.overrides})`,
								[RuntimeGlobals.overrides]
							)
						);
					parser.hooks.evaluateTypeof
						.for("__webpack_override__")
						.tap("OverridablesPlugin", evaluateToString("function"));
				};
				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("APIPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("APIPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("APIPlugin", handler);
			}
		);
	}
}

module.exports = OverridablesPlugin;
