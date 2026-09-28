/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const { parseOptions } = require("../container/options");
const WebpackError = require("../errors/WebpackError");
const { ABSOLUTE_PATH_REGEXP } = require("../util/identifier");
const ProvideForSharedDependency = require("./ProvideForSharedDependency");
const ProvideSharedDependency = require("./ProvideSharedDependency");
const ProvideSharedModuleFactory = require("./ProvideSharedModuleFactory");
const { matchesRequestFilters, matchesVersionFilters } = require("./utils");

/** @import Compilation from "../Compilation" */
/** @import Compiler from "../Compiler" */
/** @import { NormalModuleCreateData } from "../module/NormalModule" */
/** @import { SharedModuleFilter } from "./SharePlugin" */

/**
 * A string that is not empty.
 * @minLength 1
 * @typedef {string} NonEmptyString
 */

/**
 * Modules that should be provided as shared modules to the share scope.
 * @inline
 * @typedef {ProvidesItem | ProvidesObject} ProvidesBranch1Item
 */

/**
 * Don't provide a version.
 * @inline
 * @typedef {false} ProvidesConfigVersionBranch1
 */

/**
 * Version as string. Each part of the version should be separated by a dot '.'.
 * @inline
 * @typedef {string} ProvidesConfigVersionBranch2
 */

/**
 * Modules that should be provided as shared modules to the share scope.
 * @inline
 * @typedef {ProvidesConfig | ProvidesItem} ProvidesObjectValue
 */

/**
 * Modules that should be provided as shared modules to the share scope. When provided, property name is used to match modules, otherwise this is automatically inferred from share key.
 * @typedef {ProvidesBranch1Item[] | ProvidesObject} Provides
 */

/**
 * Advanced configuration for modules that should be provided as shared modules to the share scope.
 * @typedef {object} ProvidesConfig
 * @property {boolean=} eager Include the provided module directly instead behind an async request. This allows to use this shared module in initial load too. All possible shared modules need to be eager too.
 * @property {SharedModuleFilter=} exclude
 * @property {SharedModuleFilter=} include
 * @property {NonEmptyString=} shareKey Key in the share scope under which the shared modules should be stored.
 * @property {NonEmptyString=} shareScope Share scope name.
 * @property {ProvidesConfigVersionBranch1 | ProvidesConfigVersionBranch2=} version Version of the provided module. Will replace lower matching versions, but not higher.
 */

/**
 * Request to a module that should be provided as shared module to the share scope (will be resolved when relative).
 * @typedef {NonEmptyString} ProvidesItem
 */

/**
 * Modules that should be provided as shared modules to the share scope. Property names are used as share keys.
 * @typedef {{ [key: string]: ProvidesObjectValue }} ProvidesObject
 */

/**
 * Filters shared modules by version or request: with 'include' only matching modules are shared, with 'exclude' matching ones are not. A filtered-out module is resolved and bundled as if it wasn't shared.
 * @since 5.112.0
 * @typedef {object} SharedModuleFilter
 * @property {RegExp | NonEmptyString=} request Request remainder after a key ending in a slash (e.g. 'get' for 'lodash/get' under 'lodash/'). Has no effect on other keys.
 * @property {NonEmptyString=} version Version range the module's version (from its description file or the 'version' option) is tested against. A consumed module is tested through its fallback module, so this has no effect on consumes without one.
 */

/**
 * @schema plugins/sharing/ProvideSharedPlugin
 * @typedef {object} ProvideSharedPluginOptions
 * @property {Provides} provides
 * @property {NonEmptyString=} shareScope Share scope name used for all provided modules (defaults to 'default').
 */

/**
 * Defines the provide options type used by this module.
 * @typedef {object} ProvideOptions
 * @property {string} shareKey
 * @property {string} shareScope
 * @property {string | undefined | false} version
 * @property {boolean} eager
 * @property {SharedModuleFilter=} include
 * @property {SharedModuleFilter=} exclude
 */

/** @typedef {Map<string, { config: ProvideOptions, version: string | undefined | false }>} ResolvedProvideMap */

const PLUGIN_NAME = "ProvideSharedPlugin";

class ProvideSharedPlugin {
	/**
	 * Creates an instance of ProvideSharedPlugin.
	 * @param {ProvideSharedPluginOptions} options options
	 */
	constructor(options) {
		/** @type {ProvideSharedPluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.validate.tap(PLUGIN_NAME, () => {
			compiler.validate(
				() => require("../../schemas/plugins/sharing/ProvideSharedPlugin.json"),
				this.options,
				{
					name: "Provide Shared Plugin",
					baseDataPath: "options"
				},
				(options) =>
					require("../../schemas/plugins/sharing/ProvideSharedPlugin.check")(
						options
					)
			);
		});

		/** @type {[string, ProvideOptions][]} */
		const provides = parseOptions(
			this.options.provides,
			(item) => {
				if (Array.isArray(item)) {
					throw new Error("Unexpected array of provides");
				}
				/** @type {ProvideOptions} */
				const result = {
					shareKey: item,
					version: undefined,
					shareScope: this.options.shareScope || "default",
					eager: false,
					include: undefined,
					exclude: undefined
				};
				return result;
			},
			(item) => ({
				shareKey: /** @type {string} */ (item.shareKey),
				version: item.version,
				shareScope: item.shareScope || this.options.shareScope || "default",
				eager: Boolean(item.eager),
				include: item.include,
				exclude: item.exclude
			})
		).sort(([a], [b]) => {
			if (a < b) return -1;
			if (b < a) return 1;
			return 0;
		});

		/** @type {WeakMap<Compilation, ResolvedProvideMap>} */
		const compilationData = new WeakMap();

		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				/** @type {ResolvedProvideMap} */
				const resolvedProvideMap = new Map();
				/** @type {Map<string, ProvideOptions>} */
				const matchProvides = new Map();
				/** @type {Map<string, ProvideOptions>} */
				const prefixMatchProvides = new Map();
				for (const [request, config] of provides) {
					if (
						/^\.\.?(?:\/|$)/.test(request) ||
						ABSOLUTE_PATH_REGEXP.test(request)
					) {
						// relative request or absolute path
						if (
							matchesVersionFilters(
								config.version,
								config.include,
								config.exclude
							)
						) {
							resolvedProvideMap.set(request, {
								config,
								version: config.version
							});
						}
					} else if (request.endsWith("/")) {
						// module request prefix
						prefixMatchProvides.set(request, config);
					} else {
						// module request
						matchProvides.set(request, config);
					}
				}
				compilationData.set(compilation, resolvedProvideMap);
				/**
				 * Provide shared module.
				 * @param {string} key key
				 * @param {ProvideOptions} config config
				 * @param {NormalModuleCreateData["resource"]} resource resource
				 * @param {NormalModuleCreateData["resourceResolveData"]} resourceResolveData resource resolve data
				 */
				const provideSharedModule = (
					key,
					config,
					resource,
					resourceResolveData
				) => {
					let version = config.version;
					if (version === undefined) {
						let details = "";
						if (!resourceResolveData) {
							details = "No resolve data provided from resolver.";
						} else {
							const descriptionFileData =
								resourceResolveData.descriptionFileData;
							if (!descriptionFileData) {
								details =
									"No description file (usually package.json) found. Add description file with name and version, or manually specify version in shared config.";
							} else if (!descriptionFileData.version) {
								details = `No version in description file (usually package.json). Add version to description file ${resourceResolveData.descriptionFilePath}, or manually specify version in shared config.`;
							} else {
								version = /** @type {string | false | undefined} */ (
									descriptionFileData.version
								);
							}
						}
						if (!version) {
							const error = new WebpackError(
								`No version specified and unable to automatically determine one. ${details}`
							);
							error.file = `shared module ${key} -> ${resource}`;
							compilation.warnings.push(error);
						}
					}
					if (!matchesVersionFilters(version, config.include, config.exclude)) {
						return;
					}
					resolvedProvideMap.set(resource, {
						config,
						version
					});
				};
				normalModuleFactory.hooks.module.tap(
					PLUGIN_NAME,
					(module, { resource, resourceResolveData }, resolveData) => {
						if (resolvedProvideMap.has(resource)) {
							return module;
						}
						const { request } = resolveData;
						{
							const config = matchProvides.get(request);
							if (config !== undefined) {
								provideSharedModule(
									request,
									config,
									resource,
									resourceResolveData
								);
								resolveData.cacheable = false;
							}
						}
						for (const [prefix, config] of prefixMatchProvides) {
							if (request.startsWith(prefix)) {
								const remainder = request.slice(prefix.length);
								if (
									!matchesRequestFilters(
										remainder,
										config.include,
										config.exclude
									)
								) {
									continue;
								}
								provideSharedModule(
									resource,
									{
										...config,
										shareKey: config.shareKey + remainder
									},
									resource,
									resourceResolveData
								);
								resolveData.cacheable = false;
							}
						}
						return module;
					}
				);
			}
		);
		compiler.hooks.finishMake.tapPromise(PLUGIN_NAME, (compilation) => {
			const resolvedProvideMap = compilationData.get(compilation);
			if (!resolvedProvideMap) return Promise.resolve();
			return Promise.all(
				Array.from(
					resolvedProvideMap,
					([resource, { config, version }]) =>
						new Promise((resolve, reject) => {
							compilation.addInclude(
								compiler.context,
								new ProvideSharedDependency(
									config.shareScope,
									config.shareKey,
									version || false,
									resource,
									config.eager
								),
								{
									name: undefined
								},
								(err) => {
									if (err) return reject(err);
									resolve(null);
								}
							);
						})
				)
			).then(() => {});
		});

		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					ProvideForSharedDependency,
					normalModuleFactory
				);

				compilation.dependencyFactories.set(
					ProvideSharedDependency,
					new ProvideSharedModuleFactory()
				);
			}
		);
	}
}

module.exports = ProvideSharedPlugin;
