/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../module/ModuleTypeConstants");
const { getInnerGraphUtils } = require("../optimize/InnerGraph");
const { recordOptimizationBailout } = require("../util/buildDiagnostics");

const { hasTopLevelUsingDeclaration } = require("./JavascriptParserHelpers");

/** @import Compiler from "../Compiler" */
/** @import JavascriptParser from "../javascript/JavascriptParser" */

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
					/**
					 * Records a module-scope `using` declaration: nested blocks keep their
					 * own disposal scope, this one ties disposal to the module's end.
					 * @returns {void}
					 */
					const recordTopLevelUsing = () => {
						// Concatenation would defer disposal to the enclosing scope.
						parser.state.module.buildInfo.moduleConcatenationBailout =
							"a top-level using declaration";
					};
					parser.hooks.program.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, ast) => {
							if (hasTopLevelUsingDeclaration(path, ast)) {
								recordTopLevelUsing();
							}
						}
					);
					parser.hooks.call
						.for("eval")
						.tap({ name: PLUGIN_NAME, path: true }, () => {
							const buildInfo = parser.state.module.buildInfo;
							buildInfo.moduleConcatenationBailout = "eval()";
							const currentSymbol = innerGraph.getTopLevelSymbol(parser.state);
							if (currentSymbol) {
								innerGraph.addUsage(parser.state, null, currentSymbol);
							} else {
								// Only worth reporting when the analysis was actually running
								const wasEnabled = innerGraph.isEnabled(parser.state);
								innerGraph.bailout(parser.state);
								if (wasEnabled) {
									recordOptimizationBailout(
										buildInfo,
										"Inner graph bailout: eval()"
									);
								}
							}
						});
					parser.hooks.finish.tap({ name: PLUGIN_NAME, path: true }, () => {
						const buildInfo = parser.state.module.buildInfo;
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
