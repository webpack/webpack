/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const ExternalModule = require("../externals/ExternalModule");
const ExternalsPlugin = require("../externals/ExternalsPlugin");
const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const FallbackDependency = require("./FallbackDependency");
const FallbackItemDependency = require("./FallbackItemDependency");
const FallbackModuleFactory = require("./FallbackModuleFactory");
const RemoteModule = require("./RemoteModule");
const RemoteRuntimeModule = require("./RemoteRuntimeModule");
const RemoteToExternalDependency = require("./RemoteToExternalDependency");
const { addDeclaredRemotes } = require("./declaredRemotes");
const { parseOptions } = require("./options");

/** @import Compiler from "../Compiler" */

/**
 * A string that is not empty.
 * @minLength 1
 * @typedef {string} NonEmptyString
 */

/**
 * Container locations and request scopes from which modules should be resolved and loaded at runtime.
 * @inline
 * @typedef {RemotesItem | RemotesObject} RemotesBranch1Item
 */

/**
 * Container locations from which modules should be resolved and loaded at runtime.
 * @inline
 * @typedef {RemotesConfig | RemotesItem | RemotesItems} RemotesObjectValue
 */

/**
 * Specifies the default type of externals ('amd*', 'umd*', 'system' and 'jsonp' depend on output.libraryTarget set to the same value).
 * @typedef {"var" | "module" | "assign" | "this" | "window" | "self" | "global" | "commonjs" | "commonjs2" | "commonjs-module" | "commonjs-static" | "amd" | "amd-require" | "amd-async" | "umd" | "umd2" | "jsonp" | "system" | "promise" | "import" | "module-import" | "script" | "node-commonjs" | "asset" | "asset-url" | "css-import" | "css-url"} ExternalsType
 */

/**
 * Container locations and request scopes from which modules should be resolved and loaded at runtime. When provided, property name is used as request scope, otherwise request scope is automatically inferred from container location.
 * @typedef {RemotesBranch1Item[] | RemotesObject} Remotes
 */

/**
 * Advanced configuration for container locations from which modules should be resolved and loaded at runtime.
 * @typedef {object} RemotesConfig
 * @property {RemotesItem | RemotesItems} external Container locations from which modules should be resolved and loaded at runtime.
 * @property {NonEmptyString=} shareScope The name of the share scope shared with this remote.
 */

/**
 * Container location from which modules should be resolved and loaded at runtime.
 * @typedef {NonEmptyString} RemotesItem
 */

/**
 * Container locations from which modules should be resolved and loaded at runtime.
 * @typedef {RemotesItem[]} RemotesItems
 */

/**
 * Container locations from which modules should be resolved and loaded at runtime. Property names are used as request scopes.
 * @typedef {{ [key: string]: RemotesObjectValue }} RemotesObject
 */

/**
 * @schema plugins/container/ContainerReferencePlugin
 * @typedef {object} ContainerReferencePluginOptions
 * @property {ExternalsType} remoteType The external type of the remote containers.
 * @property {Remotes} remotes
 * @property {NonEmptyString=} shareScope The name of the share scope shared with all remotes (defaults to 'default').
 */

const slashCode = "/".charCodeAt(0);
const PLUGIN_NAME = "ContainerReferencePlugin";

class ContainerReferencePlugin {
	/**
	 * Creates an instance of ContainerReferencePlugin.
	 * @param {ContainerReferencePluginOptions} options options
	 */
	constructor(options) {
		/** @type {ContainerReferencePluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.validate.tap(PLUGIN_NAME, () => {
			compiler.validate(
				() =>
					require("../../schemas/plugins/container/ContainerReferencePlugin.json"),
				this.options,
				{
					name: "Container Reference Plugin",
					baseDataPath: "options"
				},
				(options) =>
					require("../../schemas/plugins/container/ContainerReferencePlugin.check")(
						options
					)
			);
		});

		const { remoteType } = this.options;
		const remotes = parseOptions(
			this.options.remotes,
			(item) => ({
				external: Array.isArray(item) ? item : [item],
				shareScope: this.options.shareScope || "default"
			}),
			(item) => ({
				external: Array.isArray(item.external)
					? item.external
					: [item.external],
				shareScope: item.shareScope || this.options.shareScope || "default"
			})
		);

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
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				addDeclaredRemotes(
					compilation,
					remotes.map(([key]) => key)
				);

				compilation.dependencyFactories.set(
					RemoteToExternalDependency,
					normalModuleFactory
				);

				compilation.dependencyFactories.set(
					FallbackItemDependency,
					normalModuleFactory
				);

				compilation.dependencyFactories.set(
					FallbackDependency,
					new FallbackModuleFactory()
				);

				normalModuleFactory.hooks.factorize.tap(PLUGIN_NAME, (data) => {
					if (!data.request.includes("!")) {
						for (const [key, config] of remotes) {
							if (
								data.request.startsWith(`${key}`) &&
								(data.request.length === key.length ||
									data.request.charCodeAt(key.length) === slashCode)
							) {
								return new RemoteModule(
									data.request,
									config.external.map((external, i) =>
										external.startsWith("internal ")
											? external.slice(9)
											: `webpack/container/reference/${key}${
													i ? `/fallback-${i}` : ""
												}`
									),
									`.${data.request.slice(key.length)}`,
									config.shareScope
								);
							}
						}
					}
				});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.ensureChunkHandlers)
					.tap(PLUGIN_NAME, (chunk, set) => {
						set.add(RuntimeGlobals.module);
						set.add(RuntimeGlobals.moduleFactoriesAddOnly);
						set.add(RuntimeGlobals.hasOwnProperty);
						set.add(RuntimeGlobals.initializeSharing);
						set.add(RuntimeGlobals.shareScopeMap);
						compilation.addRuntimeModule(chunk, new RemoteRuntimeModule());
					});

				const { chunkCondition } =
					ExternalModule.getCompilationHooks(compilation);

				// External modules issued by remote modules should be placed in entry chunks
				// to ensure they are loaded and initialize first
				chunkCondition.tap(
					PLUGIN_NAME,
					(chunk, compilation) =>
						compilation.chunkGraph.getNumberOfEntryModules(chunk) > 0
				);
			}
		);
	}
}

module.exports = ContainerReferencePlugin;
