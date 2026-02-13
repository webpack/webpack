/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const { getContext } = require("loader-runner");

const ModuleNotFoundError = require("../ModuleNotFoundError");
const NormalModule = require("../NormalModule");
const createSchemaValidation = require("../util/create-schema-validation");
const { join } = require("../util/fs");
const { parseResourceWithoutFragment } = require("../util/identifier");

const PLUGIN_NAME = "VirtualUrlPlugin";
const DEFAULT_SCHEME = "virtual";

const validate = createSchemaValidation(
	require("../../schemas/plugins/schemes/VirtualUrlPlugin.check"),
	() => require("../../schemas/plugins/schemes/VirtualUrlPlugin.json"),
	{
		name: "Virtual Url Plugin",
		baseDataPath: "options"
	}
);

/**
 * @typedef {import("../Compiler")} Compiler
 * @typedef {import("../../declarations/plugins/schemes/VirtualUrlPlugin").VirtualModule} VirtualModuleConfig
 * @typedef {import("../../declarations/plugins/schemes/VirtualUrlPlugin").VirtualModuleContent} VirtualModuleInput
 */

/** @typedef {(loaderContext: LoaderContext<EXPECTED_ANY>) => Promise<string | Buffer> | string | Buffer} SourceFn */
/** @typedef {() => string} VersionFn */
/** @typedef {{ [key: string]: VirtualModuleInput }} VirtualModules */

/**
 * @template T
 * @typedef {import("../../declarations/LoaderContext").LoaderContext<T>} LoaderContext
 */

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

/** @typedef {{ [key: string]: VirtualModuleConfig }} NormalizedModules */

/**
 * Normalizes all virtual modules with the given scheme
 * @param {VirtualModules} virtualConfigs The virtual modules to normalize
 * @param {string} scheme The URL scheme to use
 * @returns {NormalizedModules} The normalized virtual modules
 */
function normalizeModules(virtualConfigs, scheme) {
	return Object.keys(virtualConfigs).reduce((pre, id) => {
		pre[toVid(id, scheme)] = normalizeModule(virtualConfigs[id]);
		return pre;
	}, /** @type {NormalizedModules} */ ({}));
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

/**
 * Converts a virtual module id to a module id
 * @param {string} vid The virtual module id
 * @param {string} scheme The URL scheme
 * @returns {string} The module id
 */
function fromVid(vid, scheme) {
	return vid.replace(`${scheme}:`, "");
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
		/** @type {VirtualUrlPluginOptions} */
		const options = {
			modules,
			...(scheme !== undefined && { scheme })
		};
		validate(options);

		/** @type {string} */
		this.scheme = scheme || DEFAULT_SCHEME;
		/** @type {NormalizedModules} */
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
				compilation.hooks.assetPath.tap(
					{ name: PLUGIN_NAME, before: "TemplatedPathPlugin" },
					(path, data) => {
						if (data.filename && this.modules[data.filename]) {
							/**
							 * @param {string} str path
							 * @returns {string} safe path
							 */
							const toSafePath = (str) =>
								`__${str
									.replace(/:/g, "__")
									.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "")
									.replace(/[^a-z0-9._-]+/gi, "_")}`;

							// filename: virtual:logo.svg -> __virtual__logo.svg
							data.filename = toSafePath(data.filename);
						}
						return path;
					}
				);

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
						const type = virtualConfig.type || "";
						const context = virtualConfig.context || "auto";

						resourceData.path = path + type;
						resourceData.resource = path;

						if (context === "auto") {
							const context = getContext(path);
							resourceData.context =
								context === path
									? compiler.context
									: join(
											/** @type {import("..").InputFileSystem} */
											(compiler.inputFileSystem),
											compiler.context,
											fromVid(context, scheme)
										);
						} else if (context && typeof context === "string") {
							resourceData.context = context;
						} else {
							resourceData.context = compiler.context;
						}

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
	 * @param {VersionFn | true | string} version The version value or function
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
