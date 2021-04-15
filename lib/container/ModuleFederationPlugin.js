/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const { validate } = require("schema-utils");
const schema = require("../../schemas/plugins/container/ModuleFederationPlugin.json");
const SharePlugin = require("../sharing/SharePlugin");
const { intersectRuntime, mergeRuntimeOwned } = require("../util/runtime");
const ContainerPlugin = require("./ContainerPlugin");
const ContainerReferencePlugin = require("./ContainerReferencePlugin");

/** @typedef {import("../../declarations/plugins/container/ModuleFederationPlugin").ExternalsType} ExternalsType */
/** @typedef {import("../../declarations/plugins/container/ModuleFederationPlugin").ModuleFederationPluginOptions} ModuleFederationPluginOptions */
/** @typedef {import("../../declarations/plugins/container/ModuleFederationPlugin").Shared} Shared */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

class ModuleFederationPlugin {
	/**
	 * @param {ModuleFederationPluginOptions} options options
	 */
	constructor(options) {
		validate(schema, options, { name: "Module Federation Plugin" });

		this._options = options;
	}
	/** @typedef {import("../ChunkGraph")} ChunkGraph*/
	/**
	 * Apply the RuntimeRequirements
	 *
	 * @param {Compilation} compilation webpack compilation
	 * @param {Module} module the module to be added
	 * @param {RuntimeSpec} runtime the runtime scope
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 */
	enablingRuntimeRequirements(compilation, module, runtime, chunkGraph) {
		if (runtime !== undefined && typeof runtime !== "string") {
			const moduleGraph = compilation.moduleGraph;
			Array.from(moduleGraph.getIncomingConnections(module)).filter(
				connection => {
					// We are not interested in inactive connections
					if (!connection.isActive(runtime)) return false;
					// Include, but do not analyse further, connections from non-modules
					if (!connection.originModule) return true;

					// Ignore connection from orphan modules
					if (chunkGraph.getNumberOfModuleChunks(connection.originModule) === 0)
						return false;
					// We don't care for connections from other runtimes
					let originRuntime = undefined;
					for (const r of chunkGraph.getModuleRuntimes(
						connection.originModule
					)) {
						originRuntime = mergeRuntimeOwned(originRuntime, r);
					}
					return intersectRuntime(runtime, originRuntime);
				}
			);
		}
	}
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const { _options: options } = this;
		const library = options.library || { type: "var", name: options.name };
		const remoteType =
			options.remoteType ||
			(options.library &&
			schema.definitions.ExternalsType.enum.includes(options.library.type)
				? /** @type {ExternalsType} */
				  (options.library.type)
				: "script");
		if (
			library &&
			!compiler.options.output.enabledLibraryTypes.includes(library.type)
		) {
			compiler.options.output.enabledLibraryTypes.push(library.type);
		}
		compiler.hooks.afterPlugins.tap("ModuleFederationPlugin", () => {
			if (
				options.exposes &&
				(Array.isArray(options.exposes)
					? options.exposes.length > 0
					: Object.keys(options.exposes).length > 0)
			) {
				new ContainerPlugin({
					name: options.name,
					library,
					filename: options.filename,
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
					remotes: options.remotes
				}).apply(compiler);
			}
			if (options.shared) {
				new SharePlugin({
					shared: options.shared,
					shareScope: options.shareScope
				}).apply(compiler);
			}
		});
	}
}

module.exports = ModuleFederationPlugin;
