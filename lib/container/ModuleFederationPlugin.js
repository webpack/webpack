/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

import { createRequire } from "node:module";

import { SyncHook } from "tapable";
import isValidExternalsType from "../../schemas/plugins/container/ExternalsType.check.js";
import SharePlugin from "../sharing/SharePlugin.js";
import createHooksRegistry from "../util/createHooksRegistry.js";
import ContainerPlugin from "./ContainerPlugin.js";
import ContainerReferencePlugin from "./ContainerReferencePlugin.js";
import HoistContainerReferences from "./HoistContainerReferencesPlugin.js";

const require = createRequire(import.meta.url);
/** @typedef {import("../../declarations/plugins/container/ModuleFederationPlugin.js").ExternalsType} ExternalsType */
/** @typedef {import("../../declarations/plugins/container/ModuleFederationPlugin.js").ModuleFederationPluginOptions} ModuleFederationPluginOptions */
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../Dependency.js").default} Dependency */

/**
 * Defines the compilation hooks type used by this module.
 * @typedef {object} CompilationHooks
 * @property {SyncHook<Dependency>} addContainerEntryDependency
 * @property {SyncHook<Dependency>} addFederationRuntimeDependency
 */

const PLUGIN_NAME = "ModuleFederationPlugin";

class ModuleFederationPlugin {
	/**
	 * Creates an instance of ModuleFederationPlugin.
	 * @param {ModuleFederationPluginOptions} options options
	 */
	constructor(options) {
		/** @type {ModuleFederationPluginOptions} */
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
					require("../../schemas/plugins/container/ModuleFederationPlugin.json"),
				this.options,
				{
					name: "Module Federation Plugin",
					baseDataPath: "options"
				},
				(options) =>
					/** @type {typeof import("../../schemas/plugins/container/ModuleFederationPlugin.check.js")} */ (
						require("../../schemas/plugins/container/ModuleFederationPlugin.check.js")
					)(options)
			);
		});
		const { options } = this;
		const library = options.library || { type: "var", name: options.name };
		const remoteType =
			options.remoteType ||
			(options.library && isValidExternalsType(options.library.type)
				? /** @type {ExternalsType} */ (options.library.type)
				: "script");
		if (
			library &&
			!compiler.options.output.enabledLibraryTypes.includes(library.type)
		) {
			compiler.options.output.enabledLibraryTypes.push(library.type);
		}
		compiler.hooks.afterPlugins.tap(PLUGIN_NAME, () => {
			if (
				options.exposes &&
				(Array.isArray(options.exposes)
					? options.exposes.length > 0
					: Object.keys(options.exposes).length > 0)
			) {
				new ContainerPlugin({
					name: /** @type {string} */ (options.name),
					library,
					filename: options.filename,
					runtime: options.runtime,
					shareScope: options.shareScope,
					exposes: options.exposes
				}).apply(compiler);
			}
			if (
				options.remotes &&
				(Array.isArray(options.remotes)
					? options.remotes.length > 0
					: Object.keys(options.remotes).length > 0)
			) {
				new ContainerReferencePlugin({
					remoteType,
					shareScope: options.shareScope,
					remotes: options.remotes
				}).apply(compiler);
			}
			if (options.shared) {
				new SharePlugin({
					shared: options.shared,
					shareScope: options.shareScope
				}).apply(compiler);
			}
			new HoistContainerReferences().apply(compiler);
		});
	}
}

ModuleFederationPlugin.getCompilationHooks = createHooksRegistry(
	() =>
		/** @type {CompilationHooks} */ ({
			addContainerEntryDependency: new SyncHook(["dependency"]),
			addFederationRuntimeDependency: new SyncHook(["dependency"])
		})
);

export default ModuleFederationPlugin;

export { ModuleFederationPlugin as "module.exports" };
