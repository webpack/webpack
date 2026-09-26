/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { parseOptions } = require("../container/options");
const WebpackError = require("../errors/WebpackError");
const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const LazySet = require("../util/LazySet");
const memoize = require("../util/memoize");
const ConsumeSharedFallbackDependency = require("./ConsumeSharedFallbackDependency");
const ConsumeSharedModule = require("./ConsumeSharedModule");
const ConsumeSharedRuntimeModule = require("./ConsumeSharedRuntimeModule");
const ProvideForSharedDependency = require("./ProvideForSharedDependency");
const { addDeclaredShared } = require("./declaredShared");
const { resolveMatchedConfigs } = require("./resolveMatchedConfigs");
const { parseRange } = require("./semver");
const {
	getDescriptionFile,
	getRequiredVersionFromDescriptionFile,
	isRequiredVersion,
	matchesRequestFilters,
	matchesVersionFilters
} = require("./utils");

const getModuleNotFoundError = memoize(() =>
	require("../errors/ModuleNotFoundError")
);

/** @import { ResolveContext } from "enhanced-resolve" */
/** @import Compiler from "../Compiler" */
/** @import { FileSystemDependencies } from "../Compilation" */
/** @import { ResolveOptionsWithDependencyType } from "../resolve/ResolverFactory" */
/** @import { SemVerRange } from "./semver" */
/** @import { ConsumeOptions } from "./ConsumeSharedModule" */
/** @import { DescriptionFile } from "./utils" */
/** @import { SharedModuleFilter } from "./SharePlugin" */

/**
 * A string that is not empty.
 * @minLength 1
 * @typedef {string} NonEmptyString
 */

/**
 * Modules that should be consumed from share scope.
 * @inline
 * @typedef {ConsumesItem | ConsumesObject} ConsumesBranch1Item
 */

/**
 * No fallback module.
 * @inline
 * @typedef {false} ConsumesConfigImportBranch1
 */

/**
 * No version requirement check.
 * @inline
 * @typedef {false} ConsumesConfigRequiredVersionBranch1
 */

/**
 * Version as string. Can be prefixed with '^' or '~' for minimum matches. Each part of the version should be separated by a dot '.'.
 * @inline
 * @typedef {string} ConsumesConfigRequiredVersionBranch2
 */

/**
 * Modules that should be consumed from share scope.
 * @inline
 * @typedef {ConsumesConfig | ConsumesItem} ConsumesObjectValue
 */

/**
 * Modules that should be consumed from share scope. When provided, property names are used to match requested modules in this compilation.
 * @typedef {ConsumesBranch1Item[] | ConsumesObject} Consumes
 */

/**
 * Advanced configuration for modules that should be consumed from share scope.
 * @typedef {object} ConsumesConfig
 * @property {boolean=} eager Include the fallback module directly instead behind an async request. This allows to use fallback module in initial load too. All possible shared modules need to be eager too.
 * @property {SharedModuleFilter=} exclude
 * @property {ConsumesConfigImportBranch1 | ConsumesItem=} import Fallback module if no shared module is found in share scope. Defaults to the property name.
 * @property {SharedModuleFilter=} include
 * @property {NonEmptyString=} packageName Package name to determine required version from description file. This is only needed when package name can't be automatically determined from request.
 * @property {ConsumesConfigRequiredVersionBranch1 | ConsumesConfigRequiredVersionBranch2=} requiredVersion Version requirement from module in share scope.
 * @property {NonEmptyString=} shareKey Module is looked up under this key from the share scope.
 * @property {NonEmptyString=} shareScope Share scope name.
 * @property {boolean=} singleton Allow only a single version of the shared module in share scope (disabled by default).
 * @property {boolean=} strictVersion Do not accept shared module if version is not valid (defaults to yes, if local fallback module is available and shared module is not a singleton, otherwise no, has no effect if there is no required version specified).
 */

/**
 * A module that should be consumed from share scope.
 * @typedef {NonEmptyString} ConsumesItem
 */

/**
 * Modules that should be consumed from share scope. Property names are used to match requested modules in this compilation. Relative requests are resolved, module requests are matched unresolved, absolute paths will match resolved requests. A trailing slash will match all requests with this prefix. In this case shareKey must also have a trailing slash.
 * @typedef {{ [key: string]: ConsumesObjectValue }} ConsumesObject
 */

/**
 * Filters shared modules by version or request: with 'include' only matching modules are shared, with 'exclude' matching ones are not. A filtered-out module is resolved and bundled as if it wasn't shared.
 * @since 5.112.0
 * @typedef {object} SharedModuleFilter
 * @property {RegExp | NonEmptyString=} request Request remainder after a key ending in a slash (e.g. 'get' for 'lodash/get' under 'lodash/'). Has no effect on other keys.
 * @property {NonEmptyString=} version Version range the module's version (from its description file or the 'version' option) is tested against. A consumed module is tested through its fallback module, so this has no effect on consumes without one.
 */

/**
 * Options for consuming shared modules.
 * @schema plugins/sharing/ConsumeSharedPlugin
 * @typedef {object} ConsumeSharedPluginOptions
 * @property {Consumes} consumes
 * @property {NonEmptyString=} shareScope Share scope name used for all consumed modules (defaults to 'default').
 */

/**
 * Consume options plus the filters deciding which matched requests are consumed.
 * @typedef {ConsumeOptions & { include?: SharedModuleFilter, exclude?: SharedModuleFilter }} ConsumeConfig
 */

/** @type {ResolveOptionsWithDependencyType} */
const RESOLVE_OPTIONS = { dependencyType: "esm" };
const PLUGIN_NAME = "ConsumeSharedPlugin";

class ConsumeSharedPlugin {
	/**
	 * Creates an instance of ConsumeSharedPlugin.
	 * @param {ConsumeSharedPluginOptions} options options
	 */
	constructor(options) {
		/** @type {ConsumeSharedPluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		// TODO in the next major release: remove string support
		if (typeof this.options !== "string") {
			compiler.hooks.validate.tap(PLUGIN_NAME, () => {
				compiler.validate(
					() =>
						require("../../schemas/plugins/sharing/ConsumeSharedPlugin.json"),
					this.options,
					{
						name: "Consume Shared Plugin",
						baseDataPath: "options"
					},
					(options) =>
						require("../../schemas/plugins/sharing/ConsumeSharedPlugin.check")(
							options
						)
				);
			});
		}

		/** @type {[string, ConsumeConfig][]} */
		const consumes = parseOptions(
			this.options.consumes,
			(item, key) => {
				if (Array.isArray(item)) throw new Error("Unexpected array in options");
				/** @type {ConsumeConfig} */
				const result =
					item === key || !isRequiredVersion(item)
						? // item is a request/key
							{
								import: key,
								shareScope: this.options.shareScope || "default",
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
								shareScope: this.options.shareScope || "default",
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
				shareScope: item.shareScope || this.options.shareScope || "default",
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
				singleton: Boolean(item.singleton),
				eager: Boolean(item.eager),
				include: item.include,
				exclude: item.exclude
			})
		);

		compiler.hooks.thisCompilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					ConsumeSharedFallbackDependency,
					normalModuleFactory
				);

				// A key ending in a slash shares everything under it, and the
				// modules then carry the remainder appended to the share key.
				addDeclaredShared(
					compilation,
					consumes.map(([key, config]) => ({
						name: key,
						shareKey: config.shareKey,
						prefix: key.endsWith("/")
					}))
				);

				/** @typedef {Map<string, ConsumeConfig>} ConsumeMap */

				/** @type {ConsumeMap} */
				let unresolvedConsumes;
				/** @type {ConsumeMap} */
				let resolvedConsumes;
				/** @type {ConsumeMap} */
				let prefixedConsumes;
				const promise = resolveMatchedConfigs(compilation, consumes).then(
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
				 * Creates a consume shared module.
				 * @param {string} context issuer directory
				 * @param {string} request request
				 * @param {ConsumeConfig} config options
				 * @returns {Promise<ConsumeSharedModule | undefined>} create module, or undefined when filtered out
				 */
				const createConsumeSharedModule = (context, request, config) => {
					/**
					 * Required version warning.
					 * @param {string} details details
					 */
					const requiredVersionWarning = (details) => {
						const error = new WebpackError(
							`No required version specified and unable to automatically determine one. ${details}`
						);
						error.file = `shared module ${request}`;
						compilation.warnings.push(error);
					};
					const { include, exclude, ...options } = config;
					/** @type {string | undefined} */
					let fallbackVersion;
					const directFallback =
						config.import &&
						/^(?:\.\.?(?:\/|$)|\/|[A-Z]:|\\\\)/i.test(config.import);
					return Promise.all([
						new Promise(
							/**
							 * Handles the callback logic for this hook.
							 * @param {(value?: string) => void} resolve resolve
							 */
							(resolve) => {
								if (!config.import) {
									resolve();
									return;
								}
								/** @type {ResolveContext & { fileDependencies: FileSystemDependencies, contextDependencies: FileSystemDependencies, missingDependencies: FileSystemDependencies }} */
								const resolveContext = {
									fileDependencies: new LazySet(),
									contextDependencies: new LazySet(),
									missingDependencies: new LazySet()
								};
								resolver.resolve(
									{},
									directFallback ? compiler.context : context,
									config.import,
									resolveContext,
									(err, result, resolveRequest) => {
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
												new (getModuleNotFoundError())(null, err, {
													name: `resolving fallback for shared module ${request}`
												})
											);
											return resolve();
										}
										const descriptionFileData =
											resolveRequest && resolveRequest.descriptionFileData;
										if (
											descriptionFileData &&
											typeof descriptionFileData.version === "string"
										) {
											fallbackVersion = descriptionFileData.version;
										}
										resolve(/** @type {string} */ (result));
									}
								);
							}
						),
						new Promise(
							/**
							 * Handles the name callback for this hook.
							 * @param {(value?: SemVerRange) => void} resolve resolve
							 */
							(resolve) => {
								if (config.requiredVersion !== undefined) {
									resolve(/** @type {SemVerRange} */ (config.requiredVersion));
									return;
								}
								let packageName = config.packageName;
								if (packageName === undefined) {
									if (/^(?:\/|[A-Z]:|\\\\)/i.test(request)) {
										// For relative or absolute requests we don't automatically use a packageName.
										// If wished one can specify one with the packageName option.
										resolve();
										return;
									}
									const match = /^(?:@[^\\/]+[\\/])?[^\\/]+/.exec(request);
									if (!match) {
										requiredVersionWarning(
											"Unable to extract the package name from request."
										);
										resolve();
										return;
									}
									packageName = match[0];
								}

								getDescriptionFile(
									compilation.inputFileSystem,
									context,
									["package.json"],
									(err, result, checkedDescriptionFilePaths) => {
										if (err) {
											requiredVersionWarning(
												`Unable to read description file: ${err}`
											);
											return resolve();
										}
										const { data } =
											/** @type {DescriptionFile} */
											(result || {});
										if (!data) {
											if (checkedDescriptionFilePaths) {
												requiredVersionWarning(
													[
														`Unable to find required version for "${packageName}" in description file/s`,
														checkedDescriptionFilePaths.join("\n"),
														"It need to be in dependencies, devDependencies or peerDependencies."
													].join("\n")
												);
											} else {
												requiredVersionWarning(
													`Unable to find description file in ${context}.`
												);
											}

											return resolve();
										}
										if (data.name === packageName) {
											// Package self-referencing
											return resolve();
										}
										const requiredVersion =
											getRequiredVersionFromDescriptionFile(data, packageName);

										if (requiredVersion) {
											return resolve(parseRange(requiredVersion));
										}

										resolve();
									},
									(result) => {
										if (!result) return false;
										const maybeRequiredVersion =
											getRequiredVersionFromDescriptionFile(
												result.data,
												packageName
											);
										return (
											result.data.name === packageName ||
											typeof maybeRequiredVersion === "string"
										);
									}
								);
							}
						)
					]).then(([importResolved, requiredVersion]) => {
						if (
							importResolved &&
							!matchesVersionFilters(fallbackVersion, include, exclude)
						) {
							return;
						}
						return new ConsumeSharedModule(
							directFallback ? compiler.context : context,
							{
								...options,
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
									if (
										!matchesRequestFilters(
											remainder,
											options.include,
											options.exclude
										)
									) {
										continue;
									}
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
						set.add(RuntimeGlobals.moduleCache);
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
