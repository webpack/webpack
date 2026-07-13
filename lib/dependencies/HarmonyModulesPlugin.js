/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} from "../ModuleTypeConstants.js";
import CreateRequireParserPlugin from "./CreateRequireParserPlugin.js";
import HarmonyAcceptDependency from "./HarmonyAcceptDependency.js";
import HarmonyAcceptImportDependency from "./HarmonyAcceptImportDependency.js";
import HarmonyCompatibilityDependency from "./HarmonyCompatibilityDependency.js";
import HarmonyDetectionParserPlugin from "./HarmonyDetectionParserPlugin.js";
import HarmonyEvaluatedImportSpecifierDependency from "./HarmonyEvaluatedImportSpecifierDependency.js";
import HarmonyExportDependencyParserPlugin from "./HarmonyExportDependencyParserPlugin.js";
import HarmonyExportExpressionDependency from "./HarmonyExportExpressionDependency.js";
import HarmonyExportHeaderDependency from "./HarmonyExportHeaderDependency.js";
import HarmonyExportImportedSpecifierDependency from "./HarmonyExportImportedSpecifierDependency.js";
import HarmonyExportSpecifierDependency from "./HarmonyExportSpecifierDependency.js";
import HarmonyImportDependencyParserPlugin from "./HarmonyImportDependencyParserPlugin.js";
import HarmonyImportSideEffectDependency from "./HarmonyImportSideEffectDependency.js";
import HarmonyImportSpecifierDependency from "./HarmonyImportSpecifierDependency.js";
import HarmonyTopLevelThisParserPlugin from "./HarmonyTopLevelThisParserPlugin.js";
/** @typedef {import("../../declarations/WebpackOptions.js").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../javascript/JavascriptParser.js").default} Parser */

/**
 * Defines the harmony modules plugin options type used by this module.
 * @typedef {object} HarmonyModulesPluginOptions
 * @property {boolean=} deferImport
 */

const PLUGIN_NAME = "HarmonyModulesPlugin";

class HarmonyModulesPlugin {
	/**
	 * Creates an instance of HarmonyModulesPlugin.
	 * @param {HarmonyModulesPluginOptions} options options
	 */
	constructor(options) {
		/** @type {HarmonyModulesPluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					HarmonyCompatibilityDependency,
					new HarmonyCompatibilityDependency.Template()
				);

				compilation.dependencyFactories.set(
					HarmonyImportSideEffectDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HarmonyImportSideEffectDependency,
					new HarmonyImportSideEffectDependency.Template()
				);

				compilation.dependencyFactories.set(
					HarmonyImportSpecifierDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HarmonyImportSpecifierDependency,
					new HarmonyImportSpecifierDependency.Template()
				);

				compilation.dependencyFactories.set(
					HarmonyEvaluatedImportSpecifierDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HarmonyEvaluatedImportSpecifierDependency,
					new HarmonyEvaluatedImportSpecifierDependency.Template()
				);

				compilation.dependencyTemplates.set(
					HarmonyExportHeaderDependency,
					new HarmonyExportHeaderDependency.Template()
				);

				compilation.dependencyTemplates.set(
					HarmonyExportExpressionDependency,
					new HarmonyExportExpressionDependency.Template()
				);

				compilation.dependencyTemplates.set(
					HarmonyExportSpecifierDependency,
					new HarmonyExportSpecifierDependency.Template()
				);

				compilation.dependencyFactories.set(
					HarmonyExportImportedSpecifierDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HarmonyExportImportedSpecifierDependency,
					new HarmonyExportImportedSpecifierDependency.Template()
				);

				compilation.dependencyTemplates.set(
					HarmonyAcceptDependency,
					new HarmonyAcceptDependency.Template()
				);

				compilation.dependencyFactories.set(
					HarmonyAcceptImportDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HarmonyAcceptImportDependency,
					new HarmonyAcceptImportDependency.Template()
				);

				/**
				 * Handles the hook callback for this code path.
				 * @param {Parser} parser parser parser
				 * @param {JavascriptParserOptions} parserOptions parserOptions
				 * @returns {void}
				 */
				const handler = (parser, parserOptions) => {
					if (parserOptions.esm !== undefined && !parserOptions.esm) {
						return;
					}

					new HarmonyDetectionParserPlugin().apply(parser);
					new HarmonyImportDependencyParserPlugin(parserOptions).apply(parser);
					new HarmonyExportDependencyParserPlugin(parserOptions).apply(parser);
					new HarmonyTopLevelThisParserPlugin().apply(parser);
					if (parserOptions.createRequire) {
						new CreateRequireParserPlugin(parserOptions).apply(parser);
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

export default HarmonyModulesPlugin;

export { HarmonyModulesPlugin as "module.exports" };
