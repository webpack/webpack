/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/container/OverridablesPlugin.json");
const ModuleNotFoundError = require("../ModuleNotFoundError");
const RuntimeGlobals = require("../RuntimeGlobals");
const {
	toConstantDependency,
	evaluateToString
} = require("../javascript/JavascriptParserHelpers");
const LazySet = require("../util/LazySet");
const OverridableModule = require("./OverridableModule");
const OverridableOriginalDependency = require("./OverridableOriginalDependency");
const OverridablesRuntimeModule = require("./OverridablesRuntimeModule");
const { parseOptions } = require("./options");

/** @typedef {import("enhanced-resolve").ResolveContext} ResolveContext */
/** @typedef {import("../../declarations/plugins/container/OverridablesPlugin").OverridablesConfig} OverridablesConfig */
/** @typedef {import("../../declarations/plugins/container/OverridablesPlugin").OverridablesPluginOptions} OverridablesPluginOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("./OverridableModule").OverridableOptions} OverridableOptions */

const PLUGIN_NAME = "OverridablesPlugin";

class OverridablesPlugin {
	/**
	 * @param {OverridablesPluginOptions} options options
	 */
	constructor(options) {
		if (typeof options !== "string") {
			validateOptions(schema, options, { name: "Overridables Plugin" });
		}

		this._overridables = parseOptions(
			options.overridables,
			item => ({
				import: Array.isArray(item) ? item : [item]
			}),
			item => ({
				import: Array.isArray(item.import) ? item.import : [item.import]
			})
		);
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					OverridableOriginalDependency,
					normalModuleFactory
				);

				/** @type {Map<string, OverridableOptions>} */
				const resolvedOverridables = new Map();
				const resolveContext = {
					/** @type {LazySet<string>} */
					fileDependencies: new LazySet(),
					/** @type {LazySet<string>} */
					contextDependencies: new LazySet(),
					/** @type {LazySet<string>} */
					missingDependencies: new LazySet()
				};
				const resolver = compilation.resolverFactory.get(
					"normal",
					undefined,
					"esm"
				);

				/**
				 * @param {string} request imported request
				 * @param {string} name overridable name
				 * @param {OverridablesConfig} config config
				 * @returns {Promise<void>} promise
				 */
				const resolveOverridable = (request, name, config) => {
					return new Promise(resolve => {
						resolver.resolve(
							{},
							compiler.context,
							request,
							resolveContext,
							(err, result) => {
								if (err) {
									compilation.errors.push(
										new ModuleNotFoundError(null, err, {
											name: `overridable ${name}`
										})
									);
									return resolve();
								}
								resolvedOverridables.set(result, {
									name
								});
								resolve();
							}
						);
					});
				};
				const promise = Promise.all(
					this._overridables.map(([name, config]) => {
						return Promise.all(
							config.import.map(request =>
								resolveOverridable(request, name, config)
							)
						);
					})
				).then(() => {
					compilation.contextDependencies.addAll(
						resolveContext.contextDependencies
					);
					compilation.fileDependencies.addAll(resolveContext.fileDependencies);
					compilation.missingDependencies.addAll(
						resolveContext.missingDependencies
					);
				});
				normalModuleFactory.hooks.afterResolve.tapAsync(
					PLUGIN_NAME,
					(resolveData, callback) => {
						// wait for resolving to be complete
						promise.then(() => callback());
					}
				);
				normalModuleFactory.hooks.module.tap(
					PLUGIN_NAME,
					(module, createData, resolveData) => {
						if (
							resolveData.dependencies[0] instanceof
							OverridableOriginalDependency
						) {
							return;
						}
						const options = resolvedOverridables.get(createData.resource);
						if (options !== undefined) {
							return new OverridableModule(
								resolveData.context,
								resolveData.request,
								options
							);
						}
					}
				);
				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					PLUGIN_NAME,
					(chunk, set) => {
						set.add(RuntimeGlobals.module);
						set.add(RuntimeGlobals.moduleFactories);
						set.add(RuntimeGlobals.hasOwnProperty);
						compilation.addRuntimeModule(
							chunk,
							new OverridablesRuntimeModule(set)
						);
					}
				);
				const handler = parser => {
					parser.hooks.expression
						.for("__webpack_override__")
						.tap(
							PLUGIN_NAME,
							toConstantDependency(
								parser,
								`Object.assign.bind(Object, ${RuntimeGlobals.overrides})`,
								[RuntimeGlobals.overrides]
							)
						);
					parser.hooks.evaluateTypeof
						.for("__webpack_override__")
						.tap(PLUGIN_NAME, evaluateToString("function"));
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
