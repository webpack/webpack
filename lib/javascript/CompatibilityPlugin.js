/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ConstDependency = require("../dependencies/core/ConstDependency");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../module/ModuleTypeConstants");
const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const { Field, NodeType } = require("./syntax-parser");

/** @import Compiler from "../Compiler" */
/** @import { DependencyLocation } from "../graph/Dependency" */
/** @import ContextDependency from "../dependencies/context/ContextDependency" */
/** @import JavascriptParser, { Range } from "../javascript/JavascriptParser" */

/**
 * Captures the source range of a renamed compatibility binding so it can be
 * rewritten exactly once.
 * @typedef {object} CompatibilitySettingsDeclaration
 * @property {boolean} updated
 * @property {DependencyLocation} loc
 * @property {Range} range
 */

/**
 * Stores the replacement variable name and the declaration metadata tracked
 * for a compatibility rewrite.
 * @typedef {object} CompatibilitySettings
 * @property {string} name
 * @property {CompatibilitySettingsDeclaration} declaration
 */

const nestedWebpackIdentifierTag =
	/** @type {import("./JavascriptParser").Tag<CompatibilitySettings>} */ (
		Symbol("nested webpack identifier")
	);
const PLUGIN_NAME = "CompatibilityPlugin";

/**
 * Adds parser-time compatibility rewrites for legacy runtime patterns that
 * webpack still needs to recognize in user and generated code.
 */
class CompatibilityPlugin {
	/**
	 * Installs parser hooks that preserve compatibility with legacy patterns
	 * such as nested `__webpack_require__` bindings and hashbang handling.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, (parser, parserOptions) => {
						if (
							parserOptions.browserify !== undefined &&
							!parserOptions.browserify
						) {
							return;
						}

						// every `require` call reaches this tap, so it reads the call by id
						parser.hooks.call.for("require").tap(
							{ name: PLUGIN_NAME, path: true },
							/**
							 * Rewrites browserify-style delegated `require` calls into a
							 * plain webpack require reference and removes the synthetic
							 * context dependency created for the delegator pattern.
							 * @param {import("./JavascriptParser").JavascriptNodeReader} path the path
							 * @param {number} node call expression
							 * @returns {boolean | void} true when need to handle
							 */
							(path, node) => {
								// support for browserify style require delegator: "require(o, !0)"
								if (path.fieldCount(Field.arguments, node) !== 2) return;
								const second = parser.evaluateExpression(
									parser.nodeOfPath(path, path.field(1, Field.arguments, node))
								);
								if (!second.isBoolean()) return;
								if (second.asBool() !== true) return;
								const dep = new ConstDependency(
									"require",
									path.range(path.field(0, Field.callee, node))
								);
								dep.loc = parser.getLocation(parser.nodeOfPath(path, node));
								if (parser.state.current.dependencies.length > 0) {
									const last =
										/** @type {ContextDependency} */
										(
											parser.state.current.dependencies[
												parser.state.current.dependencies.length - 1
											]
										);
									if (
										last.critical &&
										last.options &&
										last.options.request === "." &&
										last.userRequest === "." &&
										last.options.recursive
									) {
										parser.state.current.dependencies.pop();
									}
								}
								parser.state.module.addPresentationalDependency(dep);
								return true;
							}
						);
					});

				/**
				 * Attaches the compatibility rewrites for a JavaScript parser
				 * instance.
				 * @param {JavascriptParser} parser the parser
				 * @returns {void}
				 */
				const handler = (parser) => {
					// Handle nested requires
					// every function declaration reaches this tap, so it reads ids
					parser.hooks.preStatementByType
						.for("FunctionDeclaration")
						.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
							if (path.type(node) !== NodeType.FunctionDeclaration) return;
							const id = path.field(0, Field.id, node);
							if (id === 0 || path.name(id) !== RuntimeGlobals.require) return;
							parser.tagVariable(path.name(id), nestedWebpackIdentifierTag, {
								name: `__nested_webpack_require_${path.start(node)}__`,
								declaration: {
									updated: false,
									loc: parser.getLocation(parser.nodeOfPath(path, id)),
									range: path.range(id)
								}
							});
							return true;
						});
					parser.hooks.pattern
						.for(RuntimeGlobals.require)
						.tap({ name: PLUGIN_NAME, path: true }, (path, pattern) => {
							const newName = `__nested_webpack_require_${path.start(pattern)}__`;
							parser.tagVariable(
								path.name(pattern),
								nestedWebpackIdentifierTag,
								{
									name: newName,
									declaration: {
										updated: false,
										loc: parser.getLocation(parser.nodeOfPath(path, pattern)),
										range: path.range(pattern)
									}
								}
							);
							if (parser.scope.topLevelScope !== true) {
								return true;
							}
						});
					parser.hooks.pattern
						.for(RuntimeGlobals.exports)
						.tap({ name: PLUGIN_NAME, path: true }, (path, pattern) => {
							const newName = "__nested_webpack_exports__";
							parser.tagVariable(
								path.name(pattern),
								nestedWebpackIdentifierTag,
								{
									name: newName,
									declaration: {
										updated: false,
										loc: parser.getLocation(parser.nodeOfPath(path, pattern)),
										range: path.range(pattern)
									}
								}
							);
							return true;
						});
					// `const` and `let` are block-pre-walked, by which point the name is no
					// longer free and `hooks.pattern` never fires, so they are tagged
					// through the declaration hooks instead.
					for (const hookMap of [
						parser.hooks.varDeclarationConst,
						parser.hooks.varDeclarationLet
					]) {
						hookMap
							.for(RuntimeGlobals.require)
							.tap({ name: PLUGIN_NAME, path: true }, (path, ident) => {
								parser.tagVariable(
									path.name(ident),
									nestedWebpackIdentifierTag,
									{
										name: `__nested_webpack_require_${path.start(ident)}__`,
										declaration: {
											updated: false,
											loc: parser.getLocation(parser.nodeOfPath(path, ident)),
											range: path.range(ident)
										}
									}
								);
							});
						hookMap
							.for(RuntimeGlobals.exports)
							.tap({ name: PLUGIN_NAME, path: true }, (path, ident) => {
								parser.tagVariable(
									path.name(ident),
									nestedWebpackIdentifierTag,
									{
										name: "__nested_webpack_exports__",
										declaration: {
											updated: false,
											loc: parser.getLocation(parser.nodeOfPath(path, ident)),
											range: path.range(ident)
										}
									}
								);
							});
					}
					// Update single `var __webpack_require__ = {};` and `var __webpack_exports__ = {};` without expression
					// every declarator reaches this tap, so it reads ids
					parser.hooks.declarator.tap(
						{ name: PLUGIN_NAME, path: true },
						(path, declarator) => {
							const id = path.field(0, Field.id, declarator);
							const idName =
								path.type(id) === NodeType.Identifier ? path.name(id) : "";
							if (
								idName === RuntimeGlobals.exports ||
								idName === RuntimeGlobals.require
							) {
								const tagData =
									/** @type {CompatibilitySettings | undefined} */ (
										parser.getTagData(idName, nestedWebpackIdentifierTag)
									);
								if (!tagData) return;
								const { name, declaration } = tagData;
								if (!declaration.updated) {
									const dep = new ConstDependency(name, declaration.range);
									dep.loc = declaration.loc;
									parser.state.module.addPresentationalDependency(dep);
									declaration.updated = true;
								}
							}
						}
					);
					parser.hooks.expression
						.for(nestedWebpackIdentifierTag)
						.tap({ name: PLUGIN_NAME, path: true }, (path, expr) => {
							const { name, declaration } =
								/** @type {CompatibilitySettings} */
								(parser.currentTagData);
							if (!declaration.updated) {
								const dep = new ConstDependency(name, declaration.range);
								dep.loc = declaration.loc;
								parser.state.module.addPresentationalDependency(dep);
								declaration.updated = true;
							}
							const dep = new ConstDependency(name, path.range(expr));
							dep.loc = parser.getLocation(parser.nodeOfPath(path, expr));
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});

					// Handle hashbang
					parser.hooks.program.tap(
						{ name: PLUGIN_NAME, path: true },
						(_path, _program, comments) => {
							if (comments.length === 0) return;
							const c = comments[0];
							if (
								c.type === "Line" &&
								/** @type {Range} */ (c.range)[0] === 0
							) {
								if (parser.state.source.slice(0, 2).toString() !== "#!") return;
								// this is a hashbang comment
								const dep = new ConstDependency("//", 0);
								dep.loc = parser.getLocation(c);
								parser.state.module.addPresentationalDependency(dep);
							}
						}
					);
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

CompatibilityPlugin.nestedWebpackIdentifierTag = nestedWebpackIdentifierTag;

module.exports = CompatibilityPlugin;
