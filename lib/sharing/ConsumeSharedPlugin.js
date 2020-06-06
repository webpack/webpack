/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/sharing/ConsumeSharedPlugin.json");
const ModuleNotFoundError = require("../ModuleNotFoundError");
const RuntimeGlobals = require("../RuntimeGlobals");
const { parseOptions } = require("../container/options");
const LazySet = require("../util/LazySet");
const ConsumeFallbackDependency = require("./ConsumeFallbackDependency");
const ConsumeSharedModule = require("./ConsumeSharedModule");
const ConsumeSharedRuntimeModule = require("./ConsumeSharedRuntimeModule");
const ProvidedDependency = require("./ProvidedDependency");
const { parseRequiredVersion, isRequiredVersion } = require("./utils");

/** @typedef {import("enhanced-resolve").ResolveContext} ResolveContext */
/** @typedef {import("../../declarations/plugins/sharing/ConsumeSharedPlugin").ConsumeSharedPluginOptions} ConsumeSharedPluginOptions */
/** @typedef {import("../../declarations/plugins/sharing/ConsumeSharedPlugin").ConsumesConfig} ConsumesConfig */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("./ConsumeSharedModule").ConsumeOptions} ConsumeOptions */

const PLUGIN_NAME = "ConsumeSharedPlugin";

class ConsumeSharedPlugin {
	/**
	 * @param {ConsumeSharedPluginOptions} options options
	 */
	constructor(options) {
		if (typeof options !== "string") {
			validateOptions(schema, options, { name: "Consumes Shared Plugin" });
		}

		/** @type {[string, ConsumeOptions][]} */
		this._consumes = parseOptions(
			options.consumes,
			(item, key) => {
				if (Array.isArray(item)) throw new Error("Unexpected array in options");
				/** @type {ConsumeOptions} */
				let result =
					item === key || !isRequiredVersion(item)
						? // item is a request/key
						  {
								import: key,
								shareScope: options.shareScope || "default",
								shareKey: key,
								requiredVersion: undefined,
								strictVersion: false,
								singleton: false,
								eager: false
						  }
						: // key is a request/key
						  // item is a version
						  {
								import: key,
								shareScope: options.shareScope || "default",
								shareKey: key,
								requiredVersion: parseRequiredVersion(item),
								strictVersion: true,
								singleton: false,
								eager: false
						  };
				return result;
			},
			(item, key) => ({
				import: item.import === false ? undefined : item.import || key,
				shareScope: item.shareScope || options.shareScope || "default",
				shareKey: item.shareKey || key,
				requiredVersion:
					typeof item.requiredVersion === "string"
						? parseRequiredVersion(item.requiredVersion)
						: item.requiredVersion,
				strictVersion:
					item.requiredVersion &&
					(typeof item.strictVersion === "boolean"
						? item.strictVersion
						: item.import !== false && !item.singleton),
				singleton: !!item.singleton,
				eager: !!item.eager
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
					ConsumeFallbackDependency,
					normalModuleFactory
				);

				/** @type {Map<string, ConsumeOptions>} */
				const resolvedConsumes = new Map();
				/** @type {Map<string, ConsumeOptions>} */
				const unresolvedConsumes = new Map();
				/** @type {Map<string, ConsumeOptions>} */
				const prefixConsumes = new Map();
				const resolveContext = {
					/** @type {LazySet<string>} */
					fileDependencies: new LazySet(),
					/** @type {LazySet<string>} */
					contextDependencies: new LazySet(),
					/** @type {LazySet<string>} */
					missingDependencies: new LazySet()
				};
				const resolver = compilation.resolverFactory.get("normal");
				/**
				 * @param {string} request imported request
				 * @param {ConsumeOptions} options options
				 * @returns {Promise<void>} promise
				 */
				const resolveConsume = (request, options) => {
					if (/^\.\.?(\/|$)/.test(request)) {
						// relative request
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
												name: `consumed shared module ${request}`
											})
										);
										return resolve();
									}
									resolvedConsumes.set(result, options);
									resolve();
								}
							);
						});
					} else if (/^(\/|[A-Za-z]:\\|\\\\)/.test(request)) {
						// absolute path
						resolvedConsumes.set(request, options);
					} else if (request.endsWith("/")) {
						// module request prefix
						prefixConsumes.set(request, options);
					} else {
						// module request
						unresolvedConsumes.set(request, options);
					}
				};
				const promise = Promise.all(
					this._consumes.map(([name, config]) => resolveConsume(name, config))
				).then(() => {
					compilation.contextDependencies.addAll(
						resolveContext.contextDependencies
					);
					compilation.fileDependencies.addAll(resolveContext.fileDependencies);
					compilation.missingDependencies.addAll(
						resolveContext.missingDependencies
					);
				});
				normalModuleFactory.hooks.factorize.tapPromise(
					PLUGIN_NAME,
					({ context, request, dependencies }) =>
						// wait for resolving to be complete
						promise.then(() => {
							if (
								dependencies[0] instanceof ConsumeFallbackDependency ||
								dependencies[0] instanceof ProvidedDependency
							) {
								return;
							}
							const match = unresolvedConsumes.get(request);
							if (match !== undefined) {
								return new ConsumeSharedModule(compiler.context, match);
							}
							for (const [prefix, options] of prefixConsumes) {
								if (request.startsWith(prefix)) {
									const remainder = request.slice(prefix.length);
									return new ConsumeSharedModule(compiler.context, {
										...options,
										import: options.import
											? options.import + remainder
											: undefined,
										shareKey: options.shareKey + remainder
									});
								}
							}
						})
				);
				normalModuleFactory.hooks.module.tap(
					PLUGIN_NAME,
					(module, createData, { context, request, dependencies }) => {
						if (
							dependencies[0] instanceof ConsumeFallbackDependency ||
							dependencies[0] instanceof ProvidedDependency
						) {
							return;
						}
						const options = resolvedConsumes.get(createData.resource);
						if (options !== undefined) {
							return new ConsumeSharedModule(compiler.context, options);
						}
					}
				);
				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					PLUGIN_NAME,
					(chunk, set) => {
						set.add(RuntimeGlobals.module);
						set.add(RuntimeGlobals.moduleFactoriesAddOnly);
						set.add(RuntimeGlobals.shareScopeMap);
						set.add(RuntimeGlobals.initializeSharing);
						set.add(RuntimeGlobals.hasOwnProperty);
						compilation.addRuntimeModule(
							chunk,
							new ConsumeSharedRuntimeModule(set)
						);
					}
				);
			}
		);
	}
}

module.exports = ConsumeSharedPlugin;
