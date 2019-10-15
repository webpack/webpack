/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ImportContextDependency = require("./ImportContextDependency");
const ImportDependency = require("./ImportDependency");
const ImportEagerDependency = require("./ImportEagerDependency");
const ImportParserPlugin = require("./ImportParserPlugin");
const ImportWeakDependency = require("./ImportWeakDependency");

/** @typedef {import("../Compiler")} Compiler */

class ImportPlugin {
	constructor(options) {
		this.options = options;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const options = this.options;
		compiler.hooks.compilation.tap(
			"ImportPlugin",
			(compilation, { contextModuleFactory, normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					ImportDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ImportDependency,
					new ImportDependency.Template()
				);

				compilation.dependencyFactories.set(
					ImportEagerDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ImportEagerDependency,
					new ImportEagerDependency.Template()
				);

				compilation.dependencyFactories.set(
					ImportWeakDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ImportWeakDependency,
					new ImportWeakDependency.Template()
				);

				compilation.dependencyFactories.set(
					ImportContextDependency,
					contextModuleFactory
				);
				compilation.dependencyTemplates.set(
					ImportContextDependency,
					new ImportContextDependency.Template()
				);

				const handler = (parser, parserOptions) => {
					if (parserOptions.import !== undefined && !parserOptions.import)
						return;

					new ImportParserPlugin(options).apply(parser);
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("ImportPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("ImportPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("ImportPlugin", handler);
			}
		);
	}
}
module.exports = ImportPlugin;
