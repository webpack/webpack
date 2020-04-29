/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra and Zackary Jackson @ScriptedAlchemy
*/

"use strict";

const ContainerPlugin = require("./ContainerPlugin");
const ContainerReferencePlugin = require("./ContainerReferencePlugin");

/** @typedef {import("../Compiler")} Compiler */

class ModuleFederationPlugin {
	constructor(options) {
		// TODO options validation
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const { options } = this;
		if (
			options.library &&
			!compiler.options.output.enabledLibraryTypes.includes(
				options.library.type
			)
		) {
			compiler.options.output.enabledLibraryTypes.push(options.library.type);
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
					library: options.library || compiler.options.output.library,
					filename: options.filename,
					exposes: options.exposes,
					overridables: options.shared
				}).apply(compiler);
			}
			if (
				options.remotes &&
				(Array.isArray(options.remotes)
					? options.remotes.length > 0
					: Object.keys(options.remotes).length > 0)
			) {
				new ContainerReferencePlugin({
					remoteType:
						options.remoteType ||
						(options.library && options.library.type) ||
						compiler.options.externalsType,
					remotes: options.remotes,
					overrides: options.shared
				}).apply(compiler);
			}
		});
	}
}

module.exports = ModuleFederationPlugin;
