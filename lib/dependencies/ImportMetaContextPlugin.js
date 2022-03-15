/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const ContextElementDependency = require("./ContextElementDependency");
const ImportMetaContextDependency = require("./ImportMetaContextDependency");
const ImportMetaContextDependencyParserPlugin = require("./ImportMetaContextDependencyParserPlugin");

/** @typedef {import("../../declarations/WebpackOptions").ResolveOptions} ResolveOptions */
/** @typedef {import("../Compiler")} Compiler */

class ImportMetaContextPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"RequireContextPlugin",
			(compilation, { contextModuleFactory, normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					ImportMetaContextDependency,
					contextModuleFactory
				);
				compilation.dependencyTemplates.set(
					ImportMetaContextDependency,
					new ImportMetaContextDependency.Template()
				);
				compilation.dependencyFactories.set(
					ContextElementDependency,
					normalModuleFactory
				);

				const handler = (parser, parserOptions) => {
					if (
						parserOptions.importMetaContext !== undefined &&
						!parserOptions.importMetaContext
					)
						return;

					new ImportMetaContextDependencyParserPlugin().apply(parser);
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("ImportMetaContextPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("ImportMetaContextPlugin", handler);
			}
		);
	}
}

module.exports = ImportMetaContextPlugin;
