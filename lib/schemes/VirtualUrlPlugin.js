/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const { NormalModule } = require("..");
const ModuleNotFoundError = require("../ModuleNotFoundError");
const { parseResourceWithoutFragment } = require("../util/identifier");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").ValueCacheVersions} ValueCacheVersions */
/** @typedef {string | Set<string>} ValueCacheVersion */

/**
 * @template T
 * @typedef {import("../../declarations/LoaderContext").LoaderContext<T>} LoaderContext
 */

const PLUGIN_NAME = "VirtualUrlPlugin";
const DEFAULT_SCHEME = "virtual";

/**
 * @typedef {object} VirtualModuleConfig
 * @property {string=} type - The module type
 * @property {(loaderContext: LoaderContext<EXPECTED_ANY>) => Promise<string> | string} source - The source function
 * @property {(() => string) | true | string=} version - Optional version function or value
 */

/**
 * @typedef {string | ((loaderContext: LoaderContext<EXPECTED_ANY>) => Promise<string> | string) | VirtualModuleConfig} VirtualModuleInput
 */

/** @typedef {{[key: string]: VirtualModuleInput}} VirtualModules */

/**
 * Normalizes a virtual module definition into a standard format
 * @param {VirtualModuleInput} virtualConfig The virtual module to normalize
 * @returns {VirtualModuleConfig} The normalized virtual module
 */
function normalizeModule(virtualConfig) {
	if (typeof virtualConfig === "string") {
		return {
			type: "",
			source() {
				return virtualConfig;
			}
		};
	} else if (typeof virtualConfig === "function") {
		return {
			type: "",
			source: virtualConfig
		};
	}
	return virtualConfig;
}

/**
 * Normalizes all virtual modules with the given scheme
 * @param {VirtualModules} virtualConfigs The virtual modules to normalize
 * @param {string} scheme The URL scheme to use
 * @returns {{[key: string]: VirtualModuleConfig}} The normalized virtual modules
 */
function normalizeModules(virtualConfigs, scheme) {
	return Object.keys(virtualConfigs).reduce((pre, id) => {
		pre[toVid(id, scheme)] = normalizeModule(virtualConfigs[id]);
		return pre;
	}, /** @type {{[key: string]: VirtualModuleConfig}} */ ({}));
}

/**
 * Converts a module id and scheme to a virtual module id
 * @param {string} id The module id
 * @param {string} scheme The URL scheme
 * @returns {string} The virtual module id
 */
function toVid(id, scheme) {
	return `${scheme}:${id}`;
}

const VALUE_DEP_VERSION = `webpack/${PLUGIN_NAME}/version`;

/**
 * Converts a module id and scheme to a cache key
 * @param {string} id The module id
 * @param {string} scheme The URL scheme
 * @returns {string} The cache key
 */
function toCacheKey(id, scheme) {
	return `${VALUE_DEP_VERSION}/${toVid(id, scheme)}`;
}

/**
 * @typedef {object} VirtualUrlPluginOptions
 * @property {VirtualModules} modules - The virtual modules
 * @property {string=} scheme - The URL scheme to use
 */

class VirtualUrlPlugin {
	/**
	 * @param {VirtualModules} modules The virtual modules
	 * @param {string=} scheme The URL scheme to use
	 */
	constructor(modules, scheme) {
		this.scheme = scheme || DEFAULT_SCHEME;
		this.modules = normalizeModules(modules, this.scheme);
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const scheme = this.scheme;
		const cachedParseResourceWithoutFragment =
			parseResourceWithoutFragment.bindCache(compiler.root);

		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.resolveForScheme
					.for(scheme)
					.tap(PLUGIN_NAME, (resourceData) => {
						const virtualConfig = this.findVirtualModuleConfigById(
							resourceData.resource
						);
						const url = cachedParseResourceWithoutFragment(
							resourceData.resource
						);
						const path = url.path;
						const type = virtualConfig.type;
						resourceData.path = path + type;
						resourceData.resource = path;

						if (virtualConfig.version) {
							const cacheKey = toCacheKey(resourceData.resource, scheme);
							const cacheVersion = this.getCacheVersion(virtualConfig.version);
							compilation.valueCacheVersions.set(
								cacheKey,
								/** @type {string} */ (cacheVersion)
							);
						}

						return true;
					});

				const hooks = NormalModule.getCompilationHooks(compilation);
				hooks.readResource
					.for(scheme)
					.tapAsync(PLUGIN_NAME, async (loaderContext, callback) => {
						const { resourcePath } = loaderContext;
						const module = /** @type {NormalModule} */ (loaderContext._module);
						const cacheKey = toCacheKey(resourcePath, scheme);

						const addVersionValueDependency = () => {
							if (!module || !module.buildInfo) return;

							const buildInfo = module.buildInfo;
							if (!buildInfo.valueDependencies) {
								buildInfo.valueDependencies = new Map();
							}

							const cacheVersion = compilation.valueCacheVersions.get(cacheKey);
							if (compilation.valueCacheVersions.has(cacheKey)) {
								buildInfo.valueDependencies.set(
									cacheKey,
									/** @type {string} */ (cacheVersion)
								);
							}
						};

						try {
							const virtualConfig =
								this.findVirtualModuleConfigById(resourcePath);
							const content = await virtualConfig.source(loaderContext);
							addVersionValueDependency();
							callback(null, content);
						} catch (err) {
							callback(/** @type {Error} */ (err));
						}
					});
			}
		);
	}

	/**
	 * @param {string} id The module id
	 * @returns {VirtualModuleConfig} The virtual module config
	 */
	findVirtualModuleConfigById(id) {
		const config = this.modules[id];
		if (!config) {
			throw new ModuleNotFoundError(
				null,
				new Error(`Can't resolve virtual module ${id}`),
				{
					name: `virtual module ${id}`
				}
			);
		}
		return config;
	}

	/**
	 * Get the cache version for a given version value
	 * @param {(() => string) | true | string} version The version value or function
	 * @returns {string | undefined} The cache version
	 */
	getCacheVersion(version) {
		return version === true
			? undefined
			: (typeof version === "function" ? version() : version) || "unset";
	}
}

VirtualUrlPlugin.DEFAULT_SCHEME = DEFAULT_SCHEME;

module.exports = VirtualUrlPlugin;
