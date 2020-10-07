/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const { validate } = require("schema-utils");
const schema = require("../../schemas/plugins/sharing/ProvideSharedPlugin.json");
const WebpackError = require("../WebpackError");
const { parseOptions } = require("../container/options");
const ProvideForSharedDependency = require("./ProvideForSharedDependency");
const ProvideSharedDependency = require("./ProvideSharedDependency");
const ProvideSharedModuleFactory = require("./ProvideSharedModuleFactory");

/** @typedef {import("../../declarations/plugins/sharing/ProvideSharedPlugin").ProvideSharedPluginOptions} ProvideSharedPluginOptions */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */

/**
 * @typedef {Object} ProvideOptions
 * @property {string} shareKey
 * @property {string} shareScope
 * @property {string | undefined | false} version
 * @property {boolean} eager
 */

/** @typedef {Map<string, { config: ProvideOptions, version: string | undefined | false }>} ResolvedProvideMap */

class ProvideSharedPlugin {
	/**
	 * @param {ProvideSharedPluginOptions} options options
	 */
	constructor(options) {
		validate(schema, options, { name: "Provide Shared Plugin" });

		/** @type {[string, ProvideOptions][]} */
		this._provides = parseOptions(
			options.provides,
			item => {
				if (Array.isArray(item))
					throw new Error("Unexpected array of provides");
				/** @type {ProvideOptions} */
				const result = {
					shareKey: item,
					version: undefined,
					shareScope: options.shareScope || "default",
					eager: false
				};
				return result;
			},
			item => ({
				shareKey: item.shareKey,
				version: item.version,
				shareScope: item.shareScope || options.shareScope || "default",
				eager: !!item.eager
			})
		);
		this._provides.sort(([a], [b]) => {
			if (a < b) return -1;
			if (b < a) return 1;
			return 0;
		});
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		/** @type {WeakMap<Compilation, ResolvedProvideMap>} */
		const compilationData = new WeakMap();

		compiler.hooks.compilation.tap(
			"ProvideSharedPlugin",
			(compilation, { normalModuleFactory }) => {
				/** @type {ResolvedProvideMap} */
				const resolvedProvideMap = new Map();
				/** @type {Map<string, ProvideOptions>} */
				const matchProvides = new Map();
				/** @type {Map<string, ProvideOptions>} */
				const prefixMatchProvides = new Map();
				for (const [request, config] of this._provides) {
					if (/^(\/|[A-Za-z]:\\|\\\\|\.\.?(\/|$))/.test(request)) {
						// relative request
						resolvedProvideMap.set(request, {
							config,
							version: config.version
						});
					} else if (/^(\/|[A-Za-z]:\\|\\\\)/.test(request)) {
						// absolute path
						resolvedProvideMap.set(request, {
							config,
							version: config.version
						});
					} else if (request.endsWith("/")) {
						// module request prefix
						prefixMatchProvides.set(request, config);
					} else {
						// module request
						matchProvides.set(request, config);
					}
				}
				compilationData.set(compilation, resolvedProvideMap);
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
							details = `No resolve data provided from resolver.`;
						} else {
							const descriptionFileData =
								resourceResolveData.descriptionFileData;
							if (!descriptionFileData) {
								details =
									"No description file (usually package.json) found. Add description file with name and version, or manually specify version in shared config.";
							} else if (!descriptionFileData.version) {
								details =
									"No version in description file (usually package.json). Add version to description file, or manually specify version in shared config.";
							} else {
								version = descriptionFileData.version;
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
					resolvedProvideMap.set(resource, {
						config,
						version
					});
				};
				normalModuleFactory.hooks.module.tap(
					"ProvideSharedPlugin",
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
		compiler.hooks.finishMake.tapPromise("ProvideSharedPlugin", compilation => {
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
								err => {
									if (err) return reject(err);
									resolve();
								}
							);
						})
				)
			).then(() => {});
		});

		compiler.hooks.compilation.tap(
			"ProvideSharedPlugin",
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
