/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const { validate } = require("schema-utils");
const schema = require("../../schemas/plugins/container/ModuleFederationPlugin.json");
const SharePlugin = require("../sharing/SharePlugin");
const ContainerPlugin = require("./ContainerPlugin");
const ContainerReferencePlugin = require("./ContainerReferencePlugin");

/** @typedef {import("../../declarations/plugins/container/ModuleFederationPlugin").ExternalsType} ExternalsType */
/** @typedef {import("../../declarations/plugins/container/ModuleFederationPlugin").ModuleFederationPluginOptions} ModuleFederationPluginOptions */
/** @typedef {import("../../declarations/plugins/container/ModuleFederationPlugin").Shared} Shared */
/** @typedef {import("../Compiler")} Compiler */

class ModuleFederationPlugin {
	/**
	 * @param {ModuleFederationPluginOptions} options options
	 */
	constructor(options) {
		validate(schema, options, { name: "Module Federation Plugin" });

		this._options = options;
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
				? /** @type {ExternalsType} */ (options.library.type)
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
