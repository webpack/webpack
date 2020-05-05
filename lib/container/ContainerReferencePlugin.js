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
const parseOptions = require("./parseOptions");

/** @typedef {import("../../declarations/plugins/container/ContainerReferencePlugin").ContainerReferencePluginOptions} ContainerReferencePluginOptions */
/** @typedef {import("../Compiler")} Compiler */

module.exports = class ContainerReferencePlugin {
	/**
	 * @param {ContainerReferencePluginOptions} options options
	 */
	constructor(options) {
		validateOptions(schema, options, { name: "Container Reference Plugin" });

		this._remoteType = options.remoteType;
		this._remotes = parseOptions(options.remotes || []);
		this._overrides = parseOptions(options.overrides || {}).sort(([a], [b]) => {
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

		const remoteExternals = {};
		for (const [key, value] of remotes) {
			remoteExternals[`webpack/container/reference/${key}`] = value;
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
							for (const [key] of remotes) {
								if (data.request.startsWith(`${key}/`)) {
									return new RemoteModule(
										data.request,
										this._overrides,
										`webpack/container/reference/${key}`,
										data.request.slice(key.length + 1)
									);
								}
							}
						}
					}
				);

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.ensureChunkHandlers)
					.tap("OverridablesPlugin", (chunk, set) => {
						set.add(RuntimeGlobals.module);
						set.add(RuntimeGlobals.moduleFactories);
						set.add(RuntimeGlobals.hasOwnProperty);
						compilation.addRuntimeModule(chunk, new RemoteRuntimeModule());
					});
			}
		);
	}
};
