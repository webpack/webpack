/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/sharing/ProvideSharedPlugin.json");
const { parseOptions } = require("../container/options");
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
 * @property {(string|number)[]} version
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
					throw new Error("Unexpected array of overrides");
				return {
					import: item,
					version: undefined,
					shareScope: options.shareScope || "default"
				};
			},
			item => ({
				import: item.import,
				version:
					typeof item.version === "string"
						? parseVersion(item.version)
						: item.version,
				shareScope: item.shareScope || options.shareScope || "default"
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
					compilation.addInclude(
						compiler.context,
						new ProvideDependency(
							config.shareScope,
							name,
							config.version,
							config.import
						),
						{
							name: undefined
						},
						err => callback(err)
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
