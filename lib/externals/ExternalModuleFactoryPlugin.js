/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const isDependencyKind = require("../graph/isDependencyKind");
const { ASSET_URL_TYPE } = require("../module/ModuleSourceTypeConstants");
const { coreModules } = require("../node/nodeBuiltins");
const { cachedSetProperty, resolveByProperty } = require("../util/cleverMerge");
const ExternalModule = require("./ExternalModule");

/** @import { ResolveContext } from "enhanced-resolve" */
/**
 * @import {
 * 	ResolveOptions,
 * 	ExternalsType,
 * 	ExternalItem,
 * 	ExternalItemFunction,
 * 	ExternalItemValue,
 * 	ExternalItemObjectKnown,
 * 	ExternalItemObjectUnknown,
 * 	ExternalItemInterop,
 * 	Externals
 * } from "../../declarations/WebpackOptions"
 */
/** @import Dependency from "../graph/Dependency" */
/** @import { DependencyMeta, ExternalModuleRequest } from "./ExternalModule" */
/**
 * @import {
 * 	IssuerLayer,
 * 	ModuleFactoryCreateDataContextInfo
 * } from "../module/ModuleFactory"
 */
/** @import NormalModuleFactory from "../module/NormalModuleFactory" */

/** @typedef {((context: string, request: string, callback: (err?: Error | null, result?: string | false, resolveRequest?: import("enhanced-resolve").ResolveRequest) => void) => void)} ExternalItemFunctionDataGetResolveCallbackResult */
/** @typedef {((context: string, request: string) => Promise<string>)} ExternalItemFunctionDataGetResolveResult */
/** @typedef {(options?: ResolveOptions) => ExternalItemFunctionDataGetResolveCallbackResult | ExternalItemFunctionDataGetResolveResult} ExternalItemFunctionDataGetResolve */

/**
 * Defines the external item function data type used by this module.
 * @typedef {object} ExternalItemFunctionData
 * @property {string} context the directory in which the request is placed
 * @property {ModuleFactoryCreateDataContextInfo} contextInfo contextual information
 * @property {string} dependencyType the category of the referencing dependency
 * @property {ExternalItemFunctionDataGetResolve} getResolve get a resolve function with the current resolver options
 * @property {string} request the request as written by the user in the require/import expression/statement
 * @property {string} originalRequest same as `request`, except for an element of a context module (a request containing an expression), where it is the request as written by the user instead of the one relative to the resolved context directory
 */

/** @typedef {((data: ExternalItemFunctionData, callback: (err?: (Error | null), result?: ExternalItemValue) => void) => void)} ExternalItemFunctionCallback */
/** @typedef {((data: ExternalItemFunctionData) => Promise<ExternalItemValue>)} ExternalItemFunctionPromise */

const UNSPECIFIED_EXTERNAL_TYPE_REGEXP = /^[a-z0-9-]+ /;
const EMPTY_RESOLVE_OPTIONS = {};
const NODE_PREFIX = "node:";

/**
 * For a node.js core module request, returns its `node:`-prefixed/unprefixed
 * counterpart so externals match regardless of which form the code uses.
 * @param {string} request the request as written in the import/require
 * @returns {string | undefined} the alternate form, or undefined when not a core module
 */
const getAlternateCoreModuleRequest = (request) => {
	if (request.startsWith(NODE_PREFIX)) {
		const name = request.slice(NODE_PREFIX.length);
		return coreModules.has(name) ? name : undefined;
	}
	return coreModules.has(request) ? NODE_PREFIX + request : undefined;
};

// TODO in the next major release: remove this
const callDeprecatedExternals = util.deprecate(
	/**
	 * Handles the callback logic for this hook.
	 * @param {ExternalItemFunction} externalsFunction externals function, written in the deprecated `(context, request, callback)` form
	 * @param {string} context context
	 * @param {string} request request
	 * @param {(err: Error | null | undefined, value: ExternalValue | undefined, ty: ExternalsType | undefined) => void} cb cb
	 */
	(externalsFunction, context, request, cb) => {
		Reflect.apply(externalsFunction, null, [context, request, cb]);
	},
	"The externals-function should be defined like ({context, request}, cb) => { ... }",
	"DEP_WEBPACK_EXTERNALS_FUNCTION_PARAMETERS"
);

/** @typedef {(layer: string | null) => ExternalItem} ExternalItemByLayerFn */
/** @typedef {ExternalItemObjectKnown & ExternalItemObjectUnknown} ExternalItemObject */

/**
 * Defines the external weak cache type used by this module.
 * @template {ExternalItemObject} T
 * @typedef {WeakMap<T, Map<IssuerLayer, Omit<T, "byLayer">>>} ExternalWeakCache
 */

/** @type {ExternalWeakCache<ExternalItemObject>} */
const cache = new WeakMap();

/**
 * Returns result.
 * @param {ExternalItemObject} obj obj
 * @param {IssuerLayer} layer layer
 * @returns {Omit<ExternalItemObject, "byLayer">} result
 */
const resolveLayer = (obj, layer) => {
	let map = cache.get(obj);
	if (map === undefined) {
		map = new Map();
		cache.set(obj, map);
	} else {
		const cacheEntry = map.get(layer);
		if (cacheEntry !== undefined) return cacheEntry;
	}
	const result = resolveByProperty(obj, "byLayer", layer);
	map.set(layer, result);
	return result;
};

// the keys `ExternalItemValueWithOptions` allows, mirroring the schema
const OPTIONS_FORM_KEYS = new Set(["external", "sideEffects"]);

/** @typedef {string | string[] | boolean | Record<string, string | string[]>} ExternalTargetValue */
/** @typedef {{ external: ExternalTargetValue, sideEffects?: boolean }} ExternalValueWithOptions */
/** @typedef {ExternalTargetValue | ExternalValueWithOptions} ExternalValue */

const PLUGIN_NAME = "ExternalModuleFactoryPlugin";

/**
 * An externals array with each run of strings merged into one set.
 * @typedef {object} GroupedExternals
 * @property {Externals[]} source the entries the grouping was built from
 * @property {(Externals | Set<string>)[]} entries the entries, each run of strings as one set
 * @property {number[]} ends for each entry, the index in the array just past it
 */

/**
 * Whether matching an externals entry can call user code, which may change the array.
 * Only a set of strings or a RegExp is matched without it; an object may hold a `byLayer` function.
 * @param {Externals | Set<string>} entry a grouped entry
 * @returns {boolean} true unless the entry is a set of strings or a RegExp
 */
const mayRunUserCode = (entry) =>
	!(entry instanceof Set || entry instanceof RegExp);

/**
 * Whether an externals array still holds the entries it was grouped from.
 * An externals function may change the array while requests are matched.
 * @param {Externals[]} externals externals array
 * @param {GroupedExternals} grouped its grouping
 * @returns {boolean} true when the grouping is current
 */
const isCurrentGrouping = (externals, grouped) => {
	const { source } = grouped;
	if (externals.length !== source.length) return false;
	for (let i = 0; i < source.length; i++) {
		if (externals[i] !== source[i]) return false;
	}
	return true;
};

class ExternalModuleFactoryPlugin {
	/**
	 * Creates an instance of ExternalModuleFactoryPlugin.
	 * @param {ExternalsType | ((dependency: Dependency) => ExternalsType)} type default external type
	 * @param {Externals} externals externals config
	 */
	constructor(type, externals) {
		this.type = type;
		/** @type {Externals} */
		this.externals = externals;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {NormalModuleFactory} normalModuleFactory the normal module factory
	 * @returns {void}
	 */
	apply(normalModuleFactory) {
		const globalType = this.type;
		/** @type {WeakMap<Externals[], GroupedExternals>} */
		const groupedArrays = new WeakMap();

		/**
		 * Merges each run of request strings in an externals array into one set.
		 * A string entry always externalizes the request as written, so which string of a run matched never matters.
		 * @param {Externals[]} externals externals array
		 * @returns {GroupedExternals} the entries with each run of strings as a set, regrouped when the array changed
		 */
		const getGroupedArray = (externals) => {
			const cached = groupedArrays.get(externals);
			if (cached !== undefined && isCurrentGrouping(externals, cached)) {
				return cached;
			}
			/** @type {GroupedExternals["entries"]} */
			const entries = [];
			/** @type {number[]} */
			const ends = [];
			/** @type {Set<string> | undefined} */
			let strings;
			for (let i = 0; i < externals.length; i++) {
				const item = externals[i];
				if (typeof item === "string") {
					if (strings === undefined) {
						strings = new Set();
						entries.push(strings);
						ends.push(i + 1);
					}
					strings.add(item);
					ends[ends.length - 1] = i + 1;
				} else {
					strings = undefined;
					entries.push(item);
					ends.push(i + 1);
				}
			}
			/** @type {GroupedExternals} */
			const grouped = { source: [...externals], entries, ends };
			groupedArrays.set(externals, grouped);
			return grouped;
		};
		normalModuleFactory.hooks.factorize.tapAsync(
			PLUGIN_NAME,
			(data, callback) => {
				const context = data.context;
				const contextInfo = data.contextInfo;
				const dependency = data.dependencies[0];
				const dependencyType = data.dependencyType;
				const request = dependency.request;
				// a context element's request is relative to the resolved directory
				// (`./file.mjs`), externals are written against what the user wrote
				const originalRequest = isDependencyKind(dependency, "context-element")
					? dependency.originalRequest
					: request;
				const hasOriginalRequest = originalRequest !== request;
				const alternateRequest = getAlternateCoreModuleRequest(request);

				/** @typedef {(err?: Error | null, externalModule?: ExternalModule) => void} HandleExternalCallback */

				/**
				 * Processes the provided value.
				 * @param {ExternalValue} value the external config
				 * @param {ExternalsType | undefined} type type of external
				 * @param {HandleExternalCallback} callback callback
				 * @param {string=} userRequest the request naming the module, the one written when omitted
				 * @returns {void}
				 */
				const handleExternal = (
					value,
					type,
					callback,
					userRequest = originalRequest
				) => {
					/** @type {boolean | undefined} */
					let sideEffects;
					/** @type {ExternalTargetValue} */
					let target;
					// the options form carries the target under `external`; a target
					// map holding an `external` type key keeps its own meaning
					if (
						typeof value === "object" &&
						value !== null &&
						!Array.isArray(value) &&
						Object.prototype.hasOwnProperty.call(value, "external") &&
						Object.keys(value).every((key) => OPTIONS_FORM_KEYS.has(key))
					) {
						const withOptions =
							/** @type {ExternalValueWithOptions} */
							(value);
						sideEffects = withOptions.sideEffects;
						target = withOptions.external;
					} else {
						target = /** @type {ExternalTargetValue} */ (value);
					}
					if (target === false) {
						// Not externals, fallback to original factory
						return callback();
					}
					/** @type {ExternalModuleRequest} */
					let externalConfig = target === true ? originalRequest : target;
					// `interop` is a reserved key on the object form, not a target;
					// pull it out so the rest stays a pure externalsType->request map.
					/** @type {ExternalItemInterop | undefined} */
					let interop;
					if (
						typeof externalConfig === "object" &&
						externalConfig !== null &&
						!Array.isArray(externalConfig) &&
						Object.prototype.hasOwnProperty.call(externalConfig, "interop")
					) {
						const { interop: interopValue, ...rest } =
							/** @type {Record<string, string | string[]> & { interop?: ExternalItemInterop }} */ (
								externalConfig
							);
						interop = interopValue;
						externalConfig = rest;
					}
					// When no explicit type is specified, extract it from the externalConfig
					if (type === undefined) {
						if (
							typeof externalConfig === "string" &&
							UNSPECIFIED_EXTERNAL_TYPE_REGEXP.test(externalConfig)
						) {
							const idx = externalConfig.indexOf(" ");
							type =
								/** @type {ExternalsType} */
								(externalConfig.slice(0, idx));
							externalConfig = externalConfig.slice(idx + 1);
						} else if (
							Array.isArray(externalConfig) &&
							externalConfig.length > 0 &&
							UNSPECIFIED_EXTERNAL_TYPE_REGEXP.test(externalConfig[0])
						) {
							const firstItem = externalConfig[0];
							const idx = firstItem.indexOf(" ");
							type = /** @type {ExternalsType} */ (firstItem.slice(0, idx));
							externalConfig = [
								firstItem.slice(idx + 1),
								...externalConfig.slice(1)
							];
						}
					}

					const defaultType =
						typeof globalType === "function"
							? globalType(dependency)
							: globalType;
					const resolvedType = type || defaultType;

					// TODO make it pluggable/add hooks to `ExternalModule` to allow output modules own externals?
					/** @type {DependencyMeta | undefined} */
					let dependencyMeta;

					if (
						isDependencyKind(dependency, "esm-import") ||
						isDependencyKind(dependency, "dynamic-import") ||
						isDependencyKind(dependency, "context-element")
					) {
						const externalType = isDependencyKind(dependency, "esm-import")
							? "module"
							: isDependencyKind(dependency, "dynamic-import")
								? "import"
								: undefined;

						dependencyMeta = {
							attributes: dependency.attributes,
							phase:
								isDependencyKind(dependency, "esm-import") ||
								isDependencyKind(dependency, "dynamic-import")
									? dependency.phase
									: undefined,
							externalType
						};
					} else if (isDependencyKind(dependency, "css-import")) {
						dependencyMeta = {
							layer: dependency.layer,
							supports: dependency.supports,
							media: dependency.media
						};
					}

					// a css `url()` reads the url out of the external: no js wrapper
					// TODO in the next major release: drop "css-url" once the alias is removed
					if (
						(resolvedType === "asset" ||
							resolvedType === ASSET_URL_TYPE ||
							resolvedType === "css-url") &&
						isDependencyKind(dependency, "css-url")
					) {
						dependencyMeta = { sourceType: ASSET_URL_TYPE };
					}

					callback(
						null,
						new ExternalModule(
							externalConfig,
							resolvedType,
							userRequest,
							dependencyMeta,
							interop,
							sideEffects
						)
					);
				};

				/**
				 * Processes the provided external.
				 * @param {Externals} externals externals config
				 * @param {HandleExternalCallback} callback callback
				 * @returns {void}
				 */
				const handleExternals = (externals, callback) => {
					if (typeof externals === "string") {
						if (
							externals === request ||
							(hasOriginalRequest && externals === originalRequest) ||
							externals === alternateRequest
						) {
							return handleExternal(originalRequest, undefined, callback);
						}
					} else if (Array.isArray(externals)) {
						const grouped = getGroupedArray(externals);
						const { entries, ends } = grouped;
						let groupIndex = 0;
						// The index into `externals` once a non-string entry changed the array.
						let liveIndex = -1;
						const next = () => {
							/** @type {boolean | undefined} */
							let asyncFlag;
							/**
							 * Handle externals and callback.
							 * @param {(Error | null)=} err err
							 * @param {ExternalModule=} module module
							 * @returns {void}
							 */
							const handleExternalsAndCallback = (err, module) => {
								if (err) return callback(err);
								if (!module) {
									if (asyncFlag) {
										asyncFlag = false;
										return;
									}
									return next();
								}
								callback(null, module);
							};

							do {
								asyncFlag = true;
								if (
									liveIndex === -1 &&
									groupIndex > 0 &&
									mayRunUserCode(entries[groupIndex - 1]) &&
									!isCurrentGrouping(externals, grouped)
								) {
									liveIndex = ends[groupIndex - 1];
								}
								if (liveIndex !== -1) {
									if (liveIndex >= externals.length) return callback();
									handleExternals(
										externals[liveIndex++],
										handleExternalsAndCallback
									);
									continue;
								}
								if (groupIndex >= entries.length) return callback();
								const item = entries[groupIndex++];
								if (item instanceof Set) {
									if (
										item.has(request) ||
										(hasOriginalRequest && item.has(originalRequest)) ||
										(alternateRequest !== undefined &&
											item.has(alternateRequest))
									) {
										return handleExternal(originalRequest, undefined, callback);
									}
									asyncFlag = false;
								} else {
									handleExternals(item, handleExternalsAndCallback);
								}
							} while (!asyncFlag);
							asyncFlag = false;
						};

						next();
						return;
					} else if (externals instanceof RegExp) {
						if (
							externals.test(request) ||
							(hasOriginalRequest && externals.test(originalRequest))
						) {
							return handleExternal(originalRequest, undefined, callback);
						}
					} else if (typeof externals === "function") {
						/**
						 * Processes the provided err.
						 * @param {Error | null | undefined} err err
						 * @param {ExternalValue=} value value
						 * @param {ExternalsType=} type type
						 * @returns {void}
						 */
						const cb = (err, value, type) => {
							if (err) return callback(err);
							if (value !== undefined) {
								handleExternal(value, type, callback);
							} else {
								callback();
							}
						};
						if (externals.length === 3) {
							// TODO in the next major release: remove this
							callDeprecatedExternals(externals, context, request, cb);
						} else {
							const promise = externals(
								{
									context,
									request,
									originalRequest,
									dependencyType,
									contextInfo,
									getResolve: (options) => (context, request, callback) => {
										/** @type {ResolveContext} */
										const resolveContext = {
											fileDependencies: data.fileDependencies,
											missingDependencies: data.missingDependencies,
											contextDependencies: data.contextDependencies
										};
										let resolver = normalModuleFactory.getResolver(
											"normal",
											dependencyType
												? cachedSetProperty(
														data.resolveOptions || EMPTY_RESOLVE_OPTIONS,
														"dependencyType",
														dependencyType
													)
												: data.resolveOptions
										);
										if (options) resolver = resolver.withOptions(options);
										if (callback) {
											resolver.resolve(
												{},
												context,
												request,
												resolveContext,
												callback
											);
										} else {
											return new Promise((resolve, reject) => {
												resolver.resolve(
													{},
													context,
													request,
													resolveContext,
													(err, result) => {
														if (err) reject(err);
														else resolve(result);
													}
												);
											});
										}
									}
								},
								cb
							);
							if (promise && promise.then) {
								promise.then((r) => cb(null, r), cb);
							}
						}
						return;
					} else if (typeof externals === "object") {
						const resolvedExternals = resolveLayer(
							externals,
							contextInfo.issuerLayer
						);
						if (
							Object.prototype.hasOwnProperty.call(resolvedExternals, request)
						) {
							return handleExternal(
								resolvedExternals[request],
								undefined,
								callback
							);
						}
						if (
							hasOriginalRequest &&
							Object.prototype.hasOwnProperty.call(
								resolvedExternals,
								originalRequest
							)
						) {
							return handleExternal(
								resolvedExternals[originalRequest],
								undefined,
								callback
							);
						}
						// Fall back to the `node:`-prefixed/unprefixed core module form.
						if (
							alternateRequest !== undefined &&
							Object.prototype.hasOwnProperty.call(
								resolvedExternals,
								alternateRequest
							)
						) {
							// Named by the key, so both spellings share one module id.
							return handleExternal(
								resolvedExternals[alternateRequest],
								undefined,
								callback,
								alternateRequest
							);
						}
					}
					callback();
				};

				handleExternals(this.externals, callback);
			}
		);
	}
}

ExternalModuleFactoryPlugin.getAlternateCoreModuleRequest =
	getAlternateCoreModuleRequest;

module.exports = ExternalModuleFactoryPlugin;
