/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/sharing/ProvideSharedPlugin.json");
const WebpackError = require("../WebpackError");
const { parseOptions } = require("../container/options");
const ProvideDependency = require("./ProvideDependency");
const ProvideModuleFactory = require("./ProvideModuleFactory");
const ProvidedDependency = require("./ProvidedDependency");
const { parseVersion } = require("./utils");

/** @typedef {import("../../declarations/plugins/sharing/ProvideSharedPlugin").ProvideSharedPluginOptions} ProvideSharedPluginOptions */
/** @typedef {import("../Compiler")} Compiler */

/**
 * @typedef {Object} ProvideOptions
 * @property {string} shareKey
 * @property {string} shareScope
 * @property {(string|number)[] | undefined | false} version
 * @property {boolean} eager
 */

class ProvideSharedPlugin {
	/**
	 * @param {ProvideSharedPluginOptions} options options
	 */
	constructor(options) {
		validateOptions(schema, options, { name: "Provide Shared Plugin" });

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
				version:
					typeof item.version === "string"
						? parseVersion(item.version)
						: item.version,
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
		const { _provides: provides } = this;
		const provideMap = new Map(provides);
		const compilationData = new WeakMap();

		// TODO resolve relative requests in provides to absolute resources

		compiler.hooks.compilation.tap(
			"ProvideSharedPlugin",
			(compilation, { normalModuleFactory }) => {
				const data = {
					provided: new Map()
				};
				compilationData.set(compilation, data);
				normalModuleFactory.hooks.module.tap(
					"ProvideSharedPlugin",
					(
						module,
						{ resource, resourceResolveData },
						{ context, request, dependencies }
					) => {
						if (
							dependencies.length === 1 &&
							dependencies[0] instanceof ProvidedDependency
						) {
							return module;
						}
						let key = request;
						let config = provideMap.get(key);
						if (config === undefined) {
							key = resource;
							config = provideMap.get(key);
						}
						if (config === undefined) return module;
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
									version = parseVersion(descriptionFileData.version);
								}
							}
							if (!version) {
								const error = new WebpackError(
									`No version specified and unable to automatically determine one. ${details}`
								);
								error.file = `shared module ${request} -> ${resource}`;
								compilation.warnings.push(error);
							}
						}
						data.provided.set(resource, {
							config,
							version
						});
						return module;
					}
				);
			}
		);
		compiler.hooks.finishMake.tapPromise("ProvideSharedPlugin", compilation => {
			const data = compilationData.get(compilation);
			if (!data) return Promise.resolve();
			return Promise.all(
				Array.from(
					data.provided,
					([resource, { config, version }]) =>
						new Promise((resolve, reject) => {
							compilation.addInclude(
								compiler.context,
								new ProvideDependency(
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
					ProvidedDependency,
					normalModuleFactory
				);

				compilation.dependencyFactories.set(
					ProvideDependency,
					new ProvideModuleFactory()
				);
			}
		);
	}
}

module.exports = ProvideSharedPlugin;
