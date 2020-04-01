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
		const { output } = compiler.options;
		new ContainerPlugin({
			name: options.name,
			library: options.library || options.library.type || output.library.type,
			filename: options.filename,
			exposes: options.exposes,
			overridables: options.shared
		}).apply(compiler);
		new ContainerReferencePlugin({
			remoteType:
				options.remoteType || compiler.options.externalsType,
			remotes: options.remotes,
			overrides: options.shared
		}).apply(compiler);
	}
}

module.exports = ModuleFederationPlugin;
