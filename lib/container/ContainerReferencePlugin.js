/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/container/ContainerReferencePlugin.json");
const ExternalsPlugin = require("../ExternalsPlugin");
const RuntimeGlobals = require("../RuntimeGlobals");
const RemoteModule = require("./RemoteModule");
const RemoteOverrideDependency = require("./RemoteOverrideDependency");
const RemoteOverridesDependency = require("./RemoteOverridesDependency");
const RemoteOverridesModuleFactory = require("./RemoteOverridesModuleFactory");
const RemoteRuntimeModule = require("./RemoteRuntimeModule");
const RemoteToExternalDependency = require("./RemoteToExternalDependency");
const { parseOptions } = require("./options");

/** @typedef {import("../../declarations/plugins/container/ContainerReferencePlugin").ContainerReferencePluginOptions} ContainerReferencePluginOptions */
/** @typedef {import("../../declarations/plugins/container/ContainerReferencePlugin").RemotesConfig} RemotesConfig */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("./RemoteOverridesModule").OverrideOptions} OverrideOptions */

const slashCode = "/".charCodeAt(0);

class ContainerReferencePlugin {
	/**
	 * @param {ContainerReferencePluginOptions} options options
	 */
	constructor(options) {
		validateOptions(schema, options, { name: "Container Reference Plugin" });

		this._remoteType = options.remoteType;
		this._remotes = parseOptions(
			options.remotes,
			item => ({
				external: Array.isArray(item) ? item : [item]
			}),
			item => ({
				external: Array.isArray(item.external) ? item.external : [item.external]
			})
		);
		/** @type {[string, OverrideOptions][]} */
		this._overrides = parseOptions(
			options.overrides,
			item => {
				if (Array.isArray(item))
					throw new Error("Unexpected array of overrides");
				return {
					import: item
				};
			},
			item => ({
				import: item.import
			})
		);
		this._overrides.sort(([a], [b]) => {
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
		const { _remotes: remotes, _remoteType: remoteType } = this;

		/** @type {Record<string, string>} */
		const remoteExternals = {};
		for (const [key, config] of remotes) {
			let i = 0;
			for (const external of config.external) {
				if (external.startsWith("internal ")) continue;
				remoteExternals[
					`webpack/container/reference/${key}${i ? `/fallback-${i}` : ""}`
				] = external;
				i++;
			}
		}

		new ExternalsPlugin(remoteType, remoteExternals).apply(compiler);

		compiler.hooks.compilation.tap(
			"ContainerReferencePlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					RemoteToExternalDependency,
					normalModuleFactory
				);

				compilation.dependencyFactories.set(
					RemoteOverrideDependency,
					normalModuleFactory
				);

				compilation.dependencyFactories.set(
					RemoteOverridesDependency,
					new RemoteOverridesModuleFactory()
				);

				normalModuleFactory.hooks.factorize.tap(
					"ContainerReferencePlugin",
					data => {
						if (!data.request.includes("!")) {
							for (const [key, config] of remotes) {
								if (
									data.request.startsWith(`${key}`) &&
									(data.request.length === key.length ||
										data.request.charCodeAt(key.length) === slashCode)
								) {
									return new RemoteModule(
										data.request,
										this._overrides,
										config.external.map((external, i) =>
											external.startsWith("internal ")
												? external.slice(9)
												: `webpack/container/reference/${key}${
														i ? `/fallback-${i}` : ""
												  }`
										),
										data.request.slice(key.length + 1)
									);
								}
							}
						}
					}
				);

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.ensureChunkHandlers)
					.tap("ContainerReferencePlugin", (chunk, set) => {
						set.add(RuntimeGlobals.module);
						set.add(RuntimeGlobals.moduleFactories);
						set.add(RuntimeGlobals.hasOwnProperty);
						compilation.addRuntimeModule(chunk, new RemoteRuntimeModule());
					});
			}
		);
	}
}

module.exports = ContainerReferencePlugin;
