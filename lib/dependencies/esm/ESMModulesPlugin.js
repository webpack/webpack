/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../../module/ModuleTypeConstants");
const CreateRequireParserPlugin = require("./CreateRequireParserPlugin");
const ESMAcceptDependency = require("./ESMAcceptDependency");
const ESMAcceptImportDependency = require("./ESMAcceptImportDependency");
const ESMCompatibilityDependency = require("./ESMCompatibilityDependency");
const ESMDetectionParserPlugin = require("./ESMDetectionParserPlugin");
const ESMEvaluatedImportSpecifierDependency = require("./ESMEvaluatedImportSpecifierDependency");
const ESMExportDependencyParserPlugin = require("./ESMExportDependencyParserPlugin");
const ESMExportExpressionDependency = require("./ESMExportExpressionDependency");
const ESMExportHeaderDependency = require("./ESMExportHeaderDependency");
const ESMExportImportedSpecifierDependency = require("./ESMExportImportedSpecifierDependency");
const ESMExportSpecifierDependency = require("./ESMExportSpecifierDependency");
const ESMImportBareSideEffectDependency = require("./ESMImportBareSideEffectDependency");
const ESMImportDependencyParserPlugin = require("./ESMImportDependencyParserPlugin");
const ESMImportSideEffectDependency = require("./ESMImportSideEffectDependency");
const ESMImportSpecifierDependency = require("./ESMImportSpecifierDependency");

const ESMTopLevelThisParserPlugin = require("./ESMTopLevelThisParserPlugin");
const TopLevelAwaitDependency = require("./TopLevelAwaitDependency");

/**
 * @import {
 * 	JavascriptParserOptions
 * } from "../../../declarations/WebpackOptions"
 */
/** @import Compiler from "../../Compiler" */
/** @import Parser from "../../javascript/JavascriptParser" */
/** @import { BuildInfo } from "../../module/Module" */

// TODO in the next major release: rename to `ESMModulesPluginOptions`
/**
 * Defines the harmony modules plugin options type used by this module.
 * @typedef {object} HarmonyModulesPluginOptions
 * @property {boolean=} deferImport
 */

const PLUGIN_NAME = "HarmonyModulesPlugin";

// TODO in the next major release: rename to `ESMModulesPlugin`
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
					ESMCompatibilityDependency,
					new ESMCompatibilityDependency.Template()
				);

				compilation.dependencyTemplates.set(
					TopLevelAwaitDependency,
					new TopLevelAwaitDependency.Template()
				);

				compilation.dependencyFactories.set(
					ESMImportSideEffectDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ESMImportSideEffectDependency,
					new ESMImportSideEffectDependency.Template()
				);

				compilation.dependencyFactories.set(
					ESMImportBareSideEffectDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ESMImportBareSideEffectDependency,
					new ESMImportBareSideEffectDependency.Template()
				);

				compilation.dependencyFactories.set(
					ESMImportSpecifierDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ESMImportSpecifierDependency,
					new ESMImportSpecifierDependency.Template()
				);

				compilation.dependencyFactories.set(
					ESMEvaluatedImportSpecifierDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ESMEvaluatedImportSpecifierDependency,
					new ESMEvaluatedImportSpecifierDependency.Template()
				);

				compilation.dependencyTemplates.set(
					ESMExportHeaderDependency,
					new ESMExportHeaderDependency.Template()
				);

				compilation.dependencyTemplates.set(
					ESMExportExpressionDependency,
					new ESMExportExpressionDependency.Template()
				);

				compilation.dependencyTemplates.set(
					ESMExportSpecifierDependency,
					new ESMExportSpecifierDependency.Template()
				);

				compilation.dependencyFactories.set(
					ESMExportImportedSpecifierDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ESMExportImportedSpecifierDependency,
					new ESMExportImportedSpecifierDependency.Template()
				);

				compilation.dependencyTemplates.set(
					ESMAcceptDependency,
					new ESMAcceptDependency.Template()
				);

				compilation.dependencyFactories.set(
					ESMAcceptImportDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ESMAcceptImportDependency,
					new ESMAcceptImportDependency.Template()
				);

				/**
				 * Handles the hook callback for this code path.
				 * @param {Parser} parser parser parser
				 * @param {JavascriptParserOptions} parserOptions parserOptions
				 * @returns {void}
				 */
				const handler = (parser, parserOptions) => {
					// TODO in the next major release: rename harmony to esm or module
					if (parserOptions.harmony !== undefined && !parserOptions.harmony) {
						return;
					}

					if (parserOptions.specNamespaceObject) {
						// Recorded on the module, because an importer asks the module it
						// imports whether its namespace is a spec exotic object.
						parser.hooks.program.tap(PLUGIN_NAME, () => {
							/** @type {BuildInfo} */
							(parser.state.module.buildInfo).specNamespaceObject = true;
						});
					}

					new ESMDetectionParserPlugin().apply(parser);
					new ESMImportDependencyParserPlugin(parserOptions).apply(parser);
					new ESMExportDependencyParserPlugin(parserOptions).apply(parser);
					new ESMTopLevelThisParserPlugin().apply(parser);
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

module.exports = HarmonyModulesPlugin;
