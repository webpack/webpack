/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("./ModuleTypeConstants");
const { getInnerGraphUtils } = require("./optimize/InnerGraph");

/** @import Compiler from "./Compiler" */
/** @import { BuildInfo } from "./Module" */
/**
 * @import {
 * 	JavascriptModuleBuildInfo
 * } from "./javascript/JavascriptModule"
 */
/** @import JavascriptParser from "./javascript/JavascriptParser" */

const PLUGIN_NAME = "JavascriptMetaInfoPlugin";

class JavascriptMetaInfoPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				const innerGraph = getInnerGraphUtils(compilation);
				/**
				 * Handles the hook callback for this code path.
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handler = (parser) => {
					parser.hooks.program.tap(PLUGIN_NAME, (ast) => {
						// Nested blocks keep their own disposal scope, only a module-scope
						// declaration ties disposal to the end of module evaluation.
						if (
							ast.body.some(
								(statement) =>
									statement.type === "VariableDeclaration" &&
									(statement.kind === "using" ||
										statement.kind === "await using")
							)
						) {
							const buildInfo =
								/** @type {JavascriptModuleBuildInfo} */
								(parser.state.module.buildInfo);
							buildInfo.usesTopLevelUsingDeclaration = true;
							// Concatenation would defer disposal to the enclosing scope.
							buildInfo.moduleConcatenationBailout =
								"a top-level using declaration";
						}
					});
					parser.hooks.call.for("eval").tap(PLUGIN_NAME, () => {
						const buildInfo =
							/** @type {JavascriptModuleBuildInfo} */
							(parser.state.module.buildInfo);
						buildInfo.moduleConcatenationBailout = "eval()";
						const currentSymbol = innerGraph.getTopLevelSymbol(parser.state);
						if (currentSymbol) {
							innerGraph.addUsage(parser.state, null, currentSymbol);
						} else {
							// Only worth reporting when the analysis was actually running
							const wasEnabled = innerGraph.isEnabled(parser.state);
							innerGraph.bailout(parser.state);
							if (wasEnabled) {
								compilation.moduleGraph
									.getOptimizationBailout(parser.state.module)
									.push("Inner graph bailout: eval()");
							}
						}
					});
					parser.hooks.finish.tap(PLUGIN_NAME, () => {
						const buildInfo =
							/** @type {BuildInfo} */
							(parser.state.module.buildInfo);
						let topLevelDeclarations = buildInfo.topLevelDeclarations;
						if (topLevelDeclarations === undefined) {
							topLevelDeclarations = buildInfo.topLevelDeclarations = new Set();
						}
						for (const name of parser.scope.definitions.asSet()) {
							if (parser.isVariableDefined(name)) {
								topLevelDeclarations.add(name);
							}
						}
					});
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}
}

module.exports = JavascriptMetaInfoPlugin;
