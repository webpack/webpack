/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const DelegatedModuleFactoryPlugin = require("./DelegatedModuleFactoryPlugin");
const NullFactory = require("./NullFactory");
const DelegatedSourceDependency = require("./dependencies/DelegatedSourceDependency");
const StaticExportsDependency = require("./dependencies/StaticExportsDependency");

/** @typedef {import("./Compiler")} Compiler */

class DelegatedPlugin {
	constructor(options) {
		this.options = options;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"DelegatedPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					DelegatedSourceDependency,
					normalModuleFactory
				);
				compilation.dependencyFactories.set(
					StaticExportsDependency,
					new NullFactory()
				);
			}
		);

		compiler.hooks.compile.tap("DelegatedPlugin", ({ normalModuleFactory }) => {
			new DelegatedModuleFactoryPlugin(this.options).apply(normalModuleFactory);
		});
	}
}

module.exports = DelegatedPlugin;
