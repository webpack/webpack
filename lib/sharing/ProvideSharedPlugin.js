/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/sharing/ProvideSharedPlugin.json");
const WebpackError = require("../WebpackError");
const { parseOptions } = require("../container/options");
const LazySet = require("../util/LazySet");
const ProvideDependency = require("./ProvideDependency");
const ProvideModuleFactory = require("./ProvideModuleFactory");
const ProvidedDependency = require("./ProvidedDependency");
const { parseVersion } = require("./utils");

/** @typedef {import("../../declarations/plugins/sharing/ProvideSharedPlugin").ProvideSharedPluginOptions} ProvideSharedPluginOptions */
/** @typedef {import("../Compiler")} Compiler */

/**
 * @typedef {Object} ProvideOptions
 * @property {string} import
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
					import: item,
					version: undefined,
					shareScope: options.shareScope || "default",
					eager: false
				};
				return result;
			},
			item => ({
				import: item.import,
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

		for (const [name, config] of provides) {
			compiler.hooks.make.tapAsync(
				"ProvideSharedPlugin",
				(compilation, callback) => {
					let version = config.version;
					const addModule = () => {
						compilation.addInclude(
							compiler.context,
							new ProvideDependency(
								config.shareScope,
								name,
								version || false,
								config.import,
								config.eager
							),
							{
								name: undefined
							},
							err => callback(err)
						);
					};
					if (
						version !== undefined ||
						config.import.startsWith("./") ||
						config.import.startsWith("../")
					) {
						return addModule();
					}
					const resolveContext = {
						/** @type {LazySet<string>} */
						fileDependencies: new LazySet(),
						/** @type {LazySet<string>} */
						contextDependencies: new LazySet(),
						/** @type {LazySet<string>} */
						missingDependencies: new LazySet()
					};
					const resolver = compiler.resolverFactory.get("normal");
					resolver.resolve(
						{},
						compiler.context,
						config.import,
						resolveContext,
						(err, result, additionalInfo) => {
							compilation.fileDependencies.addAll(
								resolveContext.fileDependencies
							);
							compilation.contextDependencies.addAll(
								resolveContext.contextDependencies
							);
							compilation.missingDependencies.addAll(
								resolveContext.missingDependencies
							);
							let details;
							if (err) {
								details = `Failed to resolve: ${err}.`;
							} else if (!result) {
								details = `Resolved to void.`;
							} else if (!additionalInfo) {
								details = `No additional info provided from resolver.`;
							} else {
								const info = /** @type {any} */ (additionalInfo);
								const descriptionFileData = info.descriptionFileData;
								if (!descriptionFileData) {
									details =
										"No description file (usually package.json) found. Add description file with name and version, or manually specify version in shared config.";
								} else if (!descriptionFileData.version) {
									details =
										"No version in description file (usually package.json). Add version to description file, or manually specify version in shared config.";
								} else if (
									descriptionFileData.name &&
									config.import !== descriptionFileData.name &&
									!config.import.startsWith(`${descriptionFileData.name}/`)
								) {
									details = `Invalid name in description file (usually package.json): ${descriptionFileData.name}. Check location of description file, update name in description file, add missing description file to the package, or manually specify version in shared config.`;
								} else {
									version = parseVersion(descriptionFileData.version);
								}
							}
							if (!version) {
								const error = new WebpackError(
									`No version specified and unable to automatically determine one. ${details}`
								);
								error.file = `shared module ${name} -> ${config.import}`;
								compilation.warnings.push(error);
							}
							addModule();
						}
					);
				}
			);
		}

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
