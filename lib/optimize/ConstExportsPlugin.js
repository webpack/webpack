/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const { UsageState } = require("../ExportsInfo");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const BasicEvaluatedExpression = require("../javascript/BasicEvaluatedExpression");
const { VariableInfoFlags } = require("../javascript/JavascriptParser");
const {
	InlinedUsedName,
	enableInlineExports,
	toInlinedValue
} = require("./InlineExports");

/** @typedef {import("./InlineExports").InlinedValue} InlinedValue */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../ExportsInfo")} ExportsInfo */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptModule").JavascriptModuleBuildInfo} JavascriptModuleBuildInfo */
/** @typedef {import("../Module").BuildInfo} BuildInfo */

/** @typedef {{ inlineExports: boolean }} ConstValueParserPluginOptions */

const PLUGIN_NAME = "ConstExportsPlugin";

// Parser tag for top-level `const X = <primitive>` bindings
const CONST_BINDING_TAG = Symbol("const binding");

class ConstExportsPlugin {
	/**
	 * @param {ConstValueParserPluginOptions} options plugin options
	 */
	constructor(options) {
		/** @type {ConstValueParserPluginOptions} */
		this.options = options;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				/**
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handleInlineExports = (parser) => {
					parser.hooks.program.tap(PLUGIN_NAME, () => {
						const buildInfo =
							/** @type {JavascriptModuleBuildInfo | undefined} */
							(parser.state.module.buildInfo);
						if (buildInfo) buildInfo.inlineExports = true;
					});

					// Propagate inlined constant through evaluator so chained constants and uses see the literal
					parser.hooks.evaluateIdentifier
						.for(CONST_BINDING_TAG)
						.tap(PLUGIN_NAME, (expr) => {
							const tagData =
								/** @type {{ value?: InlinedValue } | undefined} */
								(parser.currentTagData);
							if (!tagData || !tagData.value) return;
							const { value } = tagData;
							const eval_ = new BasicEvaluatedExpression().setRange(
								/** @type {[number, number]} */ (expr.range)
							);
							switch (value.kind) {
								case "null":
									return eval_.setNull();
								case "undefined":
									return eval_.setUndefined();
								case "boolean":
									return eval_.setBoolean(/** @type {boolean} */ (value.value));
								case "number":
									return eval_.setNumber(/** @type {number} */ (value.value));
								case "string":
									return eval_.setString(/** @type {string} */ (value.value));
							}
						});
				};

				/**
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handleConstValue = (parser) => {
					// Only const is tracked; function/class names can be reassigned in sloppy mode.
					// Re-exports always use getters: cross-module bindings may be mutable,
					// and SideEffectsFlagPlugin can rewire connections skipping the template.
					parser.hooks.preDeclarator.tap(
						PLUGIN_NAME,
						(declarator, statement) => {
							// Detect top-level `const` declarations:
							// - Tag ALL const bindings with CONST_BINDING_TAG (for const detection via tag system)
							// - Carry inlined primitive value in tag data when eligible (for inline optimization)
							if (statement.kind !== "const") return;
							if (parser.scope.topLevelScope !== true) return;

							if (declarator.id.type === "Identifier") {
								let inlinedValue;
								if (this.options.inlineExports && declarator.init) {
									const evaluated = parser.evaluateExpression(declarator.init);
									inlinedValue = toInlinedValue(evaluated);
								}
								parser.tagVariable(
									declarator.id.name,
									CONST_BINDING_TAG,
									inlinedValue ? { value: inlinedValue } : {},
									VariableInfoFlags.Normal
								);
							} else {
								// Handle destructuring patterns (ObjectPattern, ArrayPattern, etc.)
								parser.enterPattern(declarator.id, (name) => {
									parser.tagVariable(
										name,
										CONST_BINDING_TAG,
										{},
										VariableInfoFlags.Normal
									);
								});
							}
						}
					);
				};

				/**
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handler = (parser) => {
					handleConstValue(parser);
					if (this.options.inlineExports) {
						handleInlineExports(parser);
					}
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);

				if (!this.options.inlineExports) return;

				// Lets HarmonyImportSpecifierDependency.getCondition skip the inline check
				// (and stay unconditional) when this plugin is not active
				enableInlineExports(compilation.moduleGraph);

				const moduleGraph = compilation.moduleGraph;
				compilation.hooks.optimizeDependencies.tap(PLUGIN_NAME, (modules) => {
					/** @type {Set<ExportsInfo>} */
					const visited = new Set();
					/** @type {ExportsInfo[]} */
					let queue = [];
					for (const module of modules) {
						queue.push(moduleGraph.getExportsInfo(module));
					}
					while (queue.length > 0) {
						const items = queue;
						queue = [];
						for (const exportsInfo of items) {
							if (visited.has(exportsInfo)) continue;
							visited.add(exportsInfo);
							// Other-export usage means we can't safely inline (some non-statically-known consumer)
							if (
								exportsInfo.otherExportsInfo.getUsed(undefined) !==
								UsageState.Unused
							) {
								continue;
							}
							for (const exportInfo of exportsInfo.ownedExports) {
								const inlined = exportInfo.canInline();
								const doInline =
									!exportInfo.hasUsedName() &&
									inlined !== undefined &&
									exportInfo.provided === true;
								if (doInline) {
									exportInfo.setUsedName(new InlinedUsedName(inlined));
									exportsInfo.markInlinedExports();
								}
								if (exportInfo.exportsInfoOwned && exportInfo.exportsInfo) {
									const used = exportInfo.getUsed(undefined);
									if (
										used === UsageState.OnlyPropertiesUsed ||
										used === UsageState.Unused
									) {
										queue.push(exportInfo.exportsInfo);
									}
								}
							}
						}
					}
				});
			}
		);
	}
}

module.exports = ConstExportsPlugin;
module.exports.CONST_BINDING_TAG = CONST_BINDING_TAG;
