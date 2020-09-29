/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/sharing/ConsumeSharedPlugin.json");
const ModuleNotFoundError = require("../ModuleNotFoundError");
const RuntimeGlobals = require("../RuntimeGlobals");
const WebpackError = require("../WebpackError");
const { parseOptions } = require("../container/options");
const LazySet = require("../util/LazySet");
const { parseRange } = require("../util/semver");
const ConsumeSharedFallbackDependency = require("./ConsumeSharedFallbackDependency");
const ConsumeSharedModule = require("./ConsumeSharedModule");
const ConsumeSharedRuntimeModule = require("./ConsumeSharedRuntimeModule");
const ProvideForSharedDependency = require("./ProvideForSharedDependency");
const { resolveMatchedConfigs } = require("./resolveMatchedConfigs");
const {
	isRequiredVersion,
	getDescriptionFile,
	getRequiredVersionFromDescriptionFile
} = require("./utils");

/** @typedef {import("../../declarations/plugins/sharing/ConsumeSharedPlugin").ConsumeSharedPluginOptions} ConsumeSharedPluginOptions */
/** @typedef {import("../../declarations/plugins/sharing/ConsumeSharedPlugin").ConsumesConfig} ConsumesConfig */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../ResolverFactory").ResolveOptionsWithDependencyType} ResolveOptionsWithDependencyType */
/** @typedef {import("./ConsumeSharedModule").ConsumeOptions} ConsumeOptions */

/** @type {ResolveOptionsWithDependencyType} */
const RESOLVE_OPTIONS = { dependencyType: "esm" };
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
								packageName: undefined,
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
								requiredVersion: parseRange(item),
								strictVersion: true,
								packageName: undefined,
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
						? parseRange(item.requiredVersion)
						: item.requiredVersion,
				strictVersion:
					typeof item.strictVersion === "boolean"
						? item.strictVersion
						: item.import !== false && !item.singleton,
				packageName: item.packageName,
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
					ConsumeSharedFallbackDependency,
					normalModuleFactory
				);

				let unresolvedConsumes, resolvedConsumes, prefixedConsumes;
				const promise = resolveMatchedConfigs(compilation, this._consumes).then(
					({ resolved, unresolved, prefixed }) => {
						resolvedConsumes = resolved;
						unresolvedConsumes = unresolved;
						prefixedConsumes = prefixed;
					}
				);

				const resolver = compilation.resolverFactory.get(
					"normal",
					RESOLVE_OPTIONS
				);

				/**
				 * @param {string} context issuer directory
				 * @param {string} request request
				 * @param {ConsumeOptions} config options
				 * @returns {Promise<ConsumeSharedModule>} create module
				 */
				const createConsumeSharedModule = (context, request, config) => {
					const requiredVersionWarning = details => {
						const error = new WebpackError(
							`No required version specified and unable to automatically determine one. ${details}`
						);
						error.file = `shared module ${request}`;
						compilation.warnings.push(error);
					};
					const directFallback =
						config.import &&
						/^(\.\.?(\/|$)|\/|[A-Za-z]:|\\\\)/.test(config.import);
					return Promise.all([
						new Promise(resolve => {
							if (!config.import) return resolve();
							const resolveContext = {
								/** @type {LazySet<string>} */
								fileDependencies: new LazySet(),
								/** @type {LazySet<string>} */
								contextDependencies: new LazySet(),
								/** @type {LazySet<string>} */
								missingDependencies: new LazySet()
							};
							resolver.resolve(
								{},
								directFallback ? compiler.context : context,
								config.import,
								resolveContext,
								(err, result) => {
									compilation.contextDependencies.addAll(
										resolveContext.contextDependencies
									);
									compilation.fileDependencies.addAll(
										resolveContext.fileDependencies
									);
									compilation.missingDependencies.addAll(
										resolveContext.missingDependencies
									);
									if (err) {
										compilation.errors.push(
											new ModuleNotFoundError(null, err, {
												name: `resolving fallback for shared module ${request}`
											})
										);
										return resolve();
									}
									resolve(result);
								}
							);
						}),
						new Promise(resolve => {
							if (config.requiredVersion !== undefined)
								return resolve(config.requiredVersion);
							let packageName = config.packageName;
							if (packageName === undefined) {
								if (/^(\/|[A-Za-z]:|\\\\)/.test(request)) {
									// For relative or absolute requests we don't automatically use a packageName.
									// If wished one can specify one with the packageName option.
									return resolve();
								}
								const match = /^((?:@[^\\/]+[\\/])?[^\\/]+)/.exec(request);
								if (!match) {
									requiredVersionWarning(
										"Unable to extract the package name from request."
									);
									return resolve();
								}
								packageName = match[0];
							}

							getDescriptionFile(
								compilation.inputFileSystem,
								context,
								["package.json"],
								(err, result) => {
									if (err) {
										requiredVersionWarning(
											`Unable to read description file: ${err}`
										);
										return resolve();
									}
									const { data, path: descriptionPath } = result;
									if (!data) {
										requiredVersionWarning(
											`Unable to find description file in ${context}.`
										);
										return resolve();
									}
									const requiredVersion = getRequiredVersionFromDescriptionFile(
										data,
										packageName
									);
									if (typeof requiredVersion !== "string") {
										requiredVersionWarning(
											`Unable to find required version for "${packageName}" in description file (${descriptionPath}). It need to be in dependencies, devDependencies or peerDependencies.`
										);
										return resolve();
									}
									resolve(parseRange(requiredVersion));
								}
							);
						})
					]).then(([importResolved, requiredVersion]) => {
						return new ConsumeSharedModule(
							directFallback ? compiler.context : context,
							{
								...config,
								importResolved,
								import: importResolved ? config.import : undefined,
								requiredVersion
							}
						);
					});
				};

				normalModuleFactory.hooks.factorize.tapPromise(
					PLUGIN_NAME,
					({ context, request, dependencies }) =>
						// wait for resolving to be complete
						promise.then(() => {
							if (
								dependencies[0] instanceof ConsumeSharedFallbackDependency ||
								dependencies[0] instanceof ProvideForSharedDependency
							) {
								return;
							}
							const match = unresolvedConsumes.get(request);
							if (match !== undefined) {
								return createConsumeSharedModule(context, request, match);
							}
							for (const [prefix, options] of prefixedConsumes) {
								if (request.startsWith(prefix)) {
									const remainder = request.slice(prefix.length);
									return createConsumeSharedModule(context, request, {
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
				normalModuleFactory.hooks.createModule.tapPromise(
					PLUGIN_NAME,
					({ resource }, { context, dependencies }) => {
						if (
							dependencies[0] instanceof ConsumeSharedFallbackDependency ||
							dependencies[0] instanceof ProvideForSharedDependency
						) {
							return Promise.resolve();
						}
						const options = resolvedConsumes.get(resource);
						if (options !== undefined) {
							return createConsumeSharedModule(context, resource, options);
						}
						return Promise.resolve();
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
