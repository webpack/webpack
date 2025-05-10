/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const { NormalModule } = require("..");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../NormalModule")} NormalModule */

/**
 * @template T
 * @typedef {import("../../declarations/LoaderContext").LoaderContext<T>} LoaderContext
 */

const PLUGIN_NAME = "VirtualUrlPlugin";
const DEFAULT_SCHEME = "virtual";

/**
 * @typedef {object} VirtualModule
 * @property {string} type - The module type
 * @property {(resourcePath: string, loaderContext: LoaderContext<EXPECTED_ANY>) => Promise<string> | string} source - The source function
 */

/**
 * @typedef {{[key: string]: string | ((resourcePath: string, loaderContext: LoaderContext<EXPECTED_ANY>) => Promise<string> | string) | VirtualModule}} VirtualModules
 */

/**
 * Normalizes a virtual module definition into a standard format
 * @param {string | ((resourcePath: string, loaderContext: LoaderContext<EXPECTED_ANY>) => Promise<string> | string) | VirtualModule} virtualModule The virtual module to normalize
 * @returns {VirtualModule} The normalized virtual module
 */
function normalizeModule(virtualModule) {
	if (typeof virtualModule === "string") {
		return {
			type: "",
			source() {
				return virtualModule;
			}
		};
	} else if (typeof virtualModule === "function") {
		return {
			type: "",
			source: virtualModule
		};
	}
	return virtualModule;
}

/**
 * Normalizes all virtual modules with the given scheme
 * @param {VirtualModules} virtualModules The virtual modules to normalize
 * @param {string} scheme The URL scheme to use
 * @returns {{[key: string]: VirtualModule}} The normalized virtual modules
 */
function normalizeModules(virtualModules, scheme) {
	return Object.keys(virtualModules).reduce((pre, id) => {
		pre[`${scheme}:${id}`] = normalizeModule(virtualModules[id]);
		return pre;
	}, /** @type {{[key: string]: VirtualModule}} */ ({}));
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

		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.resolveForScheme
					.for(scheme)
					.tap(PLUGIN_NAME, resourceData => {
						const url = new URL(resourceData.resource);
						const path = url.pathname;

						const virtualModule = this.findVirtualModuleById(
							resourceData.resource
						);
						const type = virtualModule.type;
						resourceData.path = path + type;
						resourceData.resource = `${scheme}:${path}`;
						return true;
					});

				const hooks = NormalModule.getCompilationHooks(compilation);
				hooks.readResource
					.for(scheme)
					.tapAsync(PLUGIN_NAME, async (loaderContext, callback) => {
						const { resourcePath } = loaderContext;
						try {
							const virtualModule = this.findVirtualModuleById(resourcePath);
							const sourceContent = await virtualModule.source(
								resourcePath,
								loaderContext
							);
							callback(null, sourceContent);
						} catch (err) {
							callback(/** @type {Error} */ (err));
						}
					});
			}
		);
	}

	/**
	 * @param {string} id The module id
	 * @returns {VirtualModule} The virtual module
	 */
	findVirtualModuleById(id) {
		return this.modules[id];
	}
}

VirtualUrlPlugin.DEFAULT_SCHEME = DEFAULT_SCHEME;

module.exports = VirtualUrlPlugin;
