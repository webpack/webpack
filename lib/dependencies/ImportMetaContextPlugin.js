/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const ContextElementDependency = require("./ContextElementDependency");
const ImportMetaContextDependency = require("./ImportMetaContextDependency");
const ImportMetaContextDependencyParserPlugin = require("./ImportMetaContextDependencyParserPlugin");
const ImportMetaGlobDependency = require("./ImportMetaGlobDependency");
const ImportMetaGlobDependencyParserPlugin = require("./ImportMetaGlobDependencyParserPlugin");
const { isImportMetaFieldEnabled } = require("./ImportMetaPlugin");

/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../javascript/JavascriptParser")} Parser */

const PLUGIN_NAME = "ImportMetaContextPlugin";

/** @type {(parserOptions: JavascriptParserOptions) => boolean} */
const isImportMetaContextEnabled = (parserOptions) => {
	const importMeta = parserOptions.importMeta;
	if (
		Boolean(importMeta) &&
		typeof importMeta === "object" &&
		Object.prototype.hasOwnProperty.call(importMeta, "webpackContext")
	) {
		return isImportMetaFieldEnabled(importMeta, "webpackContext");
	}
	if (parserOptions.importMetaContext === false) {
		return false;
	}
	return isImportMetaFieldEnabled(importMeta, "webpackContext");
};

// Gated only by the `importMeta.glob` field — independent of the legacy
// `importMetaContext` toggle, which controls `import.meta.webpackContext`.
/** @type {(parserOptions: JavascriptParserOptions) => boolean} */
const isImportMetaGlobEnabled = (parserOptions) =>
	isImportMetaFieldEnabled(parserOptions.importMeta, "glob");

class ImportMetaContextPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
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
					ImportMetaGlobDependency,
					contextModuleFactory
				);
				compilation.dependencyTemplates.set(
					ImportMetaGlobDependency,
					new ImportMetaGlobDependency.Template()
				);
				compilation.dependencyFactories.set(
					ContextElementDependency,
					normalModuleFactory
				);

				/**
				 * Handles the hook callback for this code path.
				 * @param {Parser} parser parser parser
				 * @param {JavascriptParserOptions} parserOptions parserOptions
				 * @returns {void}
				 */
				const handler = (parser, parserOptions) => {
					if (isImportMetaContextEnabled(parserOptions)) {
						new ImportMetaContextDependencyParserPlugin().apply(parser);
					}
					if (isImportMetaGlobEnabled(parserOptions)) {
						new ImportMetaGlobDependencyParserPlugin().apply(parser);
					}
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}
}

module.exports = ImportMetaContextPlugin;
