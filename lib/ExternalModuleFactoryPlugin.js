/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const ExternalModule = require("./ExternalModule");
const { resolveByProperty, cachedSetProperty } = require("./util/cleverMerge");

/** @typedef {import("../declarations/WebpackOptions").Externals} Externals */
/** @typedef {import("./NormalModuleFactory")} NormalModuleFactory */

const UNSPECIFIED_EXTERNAL_TYPE_REGEXP = /^[a-z0-9-]+ /;
const EMPTY_RESOLVE_OPTIONS = {};

// TODO webpack 6 remove this
const callDeprecatedExternals = util.deprecate(
	(externalsFunction, context, request, cb) => {
		externalsFunction.call(null, context, request, cb);
	},
	"The externals-function should be defined like ({context, request}, cb) => { ... }",
	"DEP_WEBPACK_EXTERNALS_FUNCTION_PARAMETERS"
);

const cache = new WeakMap();

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

class ExternalModuleFactoryPlugin {
	/**
	 * @param {string | undefined} type default external type
	 * @param {Externals} externals externals config
	 */
	constructor(type, externals) {
		this.type = type;
		this.externals = externals;
	}

	/**
	 * @param {NormalModuleFactory} normalModuleFactory the normal module factory
	 * @returns {void}
	 */
	apply(normalModuleFactory) {
		const globalType = this.type;
		normalModuleFactory.hooks.factorize.tapAsync(
			"ExternalModuleFactoryPlugin",
			(data, callback) => {
				const context = data.context;
				const contextInfo = data.contextInfo;
				const dependency = data.dependencies[0];
				const dependencyType = data.dependencyType;

				/**
				 * @param {string|string[]|boolean|Record<string, string|string[]>} value the external config
				 * @param {string|undefined} type type of external
				 * @param {function(Error=, ExternalModule=): void} callback callback
				 * @returns {void}
				 */
				const handleExternal = (value, type, callback) => {
					if (value === false) {
						// Not externals, fallback to original factory
						return callback();
					}
					/** @type {string | string[] | Record<string, string|string[]>} */
					let externalConfig;
					if (value === true) {
						externalConfig = dependency.request;
					} else {
						externalConfig = value;
					}
					// When no explicit type is specified, extract it from the externalConfig
					if (type === undefined) {
						if (
							typeof externalConfig === "string" &&
							UNSPECIFIED_EXTERNAL_TYPE_REGEXP.test(externalConfig)
						) {
							const idx = externalConfig.indexOf(" ");
							type = externalConfig.slice(0, idx);
							externalConfig = externalConfig.slice(idx + 1);
						} else if (
							Array.isArray(externalConfig) &&
							externalConfig.length > 0 &&
							UNSPECIFIED_EXTERNAL_TYPE_REGEXP.test(externalConfig[0])
						) {
							const firstItem = externalConfig[0];
							const idx = firstItem.indexOf(" ");
							type = firstItem.slice(0, idx);
							externalConfig = [
								firstItem.slice(idx + 1),
								...externalConfig.slice(1)
							];
						}
					}
					callback(
						null,
						new ExternalModule(
							externalConfig,
							type || globalType,
							dependency.request
						)
					);
				};

				/**
				 * @param {Externals} externals externals config
				 * @param {function((Error | null)=, ExternalModule=): void} callback callback
				 * @returns {void}
				 */
				const handleExternals = (externals, callback) => {
					if (typeof externals === "string") {
						if (externals === dependency.request) {
							return handleExternal(dependency.request, undefined, callback);
						}
					} else if (Array.isArray(externals)) {
						let i = 0;
						const next = () => {
							let asyncFlag;
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
								if (i >= externals.length) return callback();
								handleExternals(externals[i++], handleExternalsAndCallback);
							} while (!asyncFlag);
							asyncFlag = false;
						};

						next();
						return;
					} else if (externals instanceof RegExp) {
						if (externals.test(dependency.request)) {
							return handleExternal(dependency.request, undefined, callback);
						}
					} else if (typeof externals === "function") {
						const cb = (err, value, type) => {
							if (err) return callback(err);
							if (value !== undefined) {
								handleExternal(value, type, callback);
							} else {
								callback();
							}
						};
						if (externals.length === 3) {
							// TODO webpack 6 remove this
							callDeprecatedExternals(
								externals,
								context,
								dependency.request,
								cb
							);
						} else {
							const promise = externals(
								{
									context,
									request: dependency.request,
									dependencyType,
									contextInfo,
									getResolve: options => (context, request, callback) => {
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
							if (promise && promise.then) promise.then(r => cb(null, r), cb);
						}
						return;
					} else if (typeof externals === "object") {
						const resolvedExternals = resolveLayer(
							externals,
							contextInfo.issuerLayer
						);
						if (
							Object.prototype.hasOwnProperty.call(
								resolvedExternals,
								dependency.request
							)
						) {
							return handleExternal(
								resolvedExternals[dependency.request],
								undefined,
								callback
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
module.exports = ExternalModuleFactoryPlugin;
