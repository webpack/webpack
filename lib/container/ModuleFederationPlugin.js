/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const isValidExternalsType = require("../../schemas/plugins/container/ExternalsType.check");
const SharePlugin = require("../sharing/SharePlugin");
const ContainerPlugin = require("./ContainerPlugin");
const ContainerReferencePlugin = require("./ContainerReferencePlugin");
const HoistContainerReferences = require("./HoistContainerReferencesPlugin");
const getCompilationHooks = require("./moduleFederationHooks");

/**
 * @import {
 * 	ExternalsType,
 * 	ModuleFederationPluginOptions
 * } from "../../declarations/plugins/container/ModuleFederationPlugin"
 */
/** @import Compiler from "../Compiler" */

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
					require("../../schemas/plugins/container/ModuleFederationPlugin.check")(
						options
					)
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

ModuleFederationPlugin.getCompilationHooks = getCompilationHooks;

module.exports = ModuleFederationPlugin;
