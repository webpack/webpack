/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

import {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} from "../ModuleTypeConstants.js";
import ContextElementDependency from "./ContextElementDependency.js";
import ImportMetaContextDependency from "./ImportMetaContextDependency.js";
import ImportMetaContextDependencyParserPlugin from "./ImportMetaContextDependencyParserPlugin.js";
import ImportMetaGlobDependency from "./ImportMetaGlobDependency.js";
import ImportMetaGlobDependencyParserPlugin from "./ImportMetaGlobDependencyParserPlugin.js";
import { isImportMetaFieldEnabled } from "./ImportMetaPlugin.js";
/** @typedef {import("../../declarations/WebpackOptions.js").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../javascript/JavascriptParser.js").default} Parser */

const PLUGIN_NAME = "ImportMetaContextPlugin";

/** @type {(parserOptions: JavascriptParserOptions) => boolean} */
const isImportMetaContextEnabled = (parserOptions) => {
	const importMeta = parserOptions.importMeta;
	if (
		Boolean(importMeta) &&
		typeof importMeta === "object" &&
		Object.hasOwn(importMeta, "webpackContext")
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

export default ImportMetaContextPlugin;

export { ImportMetaContextPlugin as "module.exports" };
