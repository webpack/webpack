/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const DelegatedModuleFactoryPlugin = require("./DelegatedModuleFactoryPlugin");
const DelegatedSourceDependency = require("./dependencies/DelegatedSourceDependency");
const DelegatedExportsDependency = require("./dependencies/DelegatedExportsDependency");
const NullFactory = require("./NullFactory");

/** @typedef {import("./Compiler")} Compiler */

class DelegatedPlugin {
	constructor(options) {
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler Webpack Compiler
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
					DelegatedExportsDependency,
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
