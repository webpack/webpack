/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const WebpackError = require("../../errors/WebpackError");
const {
	evaluateToIdentifierByPath
} = require("../../javascript/JavascriptParserHelpers");
const { Field, NodeType } = require("../../javascript/syntax").parser;
const ImportMetaContextDependency = require("./ImportMetaContextDependency");

/** @import JavascriptParser, { JavascriptNodeReader } from "../../javascript/JavascriptParser" */
/** @import { ContextModuleOptions, ContextMode } from "../../context/ContextModule" */
/** @import { ChunkName } from "../../graph/Chunk" */
/** @import { RawChunkGroupOptions } from "../../graph/ChunkGroup" */
/** @import { RawReferencedExports, DependencyLocation } from "../../graph/Dependency" */
/** @import BasicEvaluatedExpression from "../../javascript/BasicEvaluatedExpression" */

/** @typedef {Pick<ContextModuleOptions, "mode" | "recursive" | "regExp" | "include" | "exclude" | "chunkName"> & { groupOptions: RawChunkGroupOptions, exports?: RawReferencedExports }} ImportMetaContextOptions */

/**
 * Creates a property parse error.
 * @param {JavascriptParser} parser the parser
 * @param {JavascriptNodeReader} path the reader of the call
 * @param {number} prop property
 * @param {string} expect except message
 * @returns {WebpackError} error
 */
function createPropertyParseError(parser, path, prop, expect) {
	return createError(
		`Parsing import.meta.webpackContext options failed. Unknown value for property ${JSON.stringify(
			path.name(path.field(0, Field.key, prop))
		)}, expected type ${expect}.`,
		parser.getLocation(
			parser.nodeOfPath(path, path.field(0, Field.value, prop))
		)
	);
}

/**
 * Creates an error from the provided msg.
 * @param {string} msg message
 * @param {DependencyLocation} loc location
 * @returns {WebpackError} error
 */
function createError(msg, loc) {
	const error = new WebpackError(msg);
	error.name = "ImportMetaContextError";
	error.loc = loc;
	return error;
}

const PLUGIN_NAME = "ImportMetaContextDependencyParserPlugin";

module.exports = class ImportMetaContextDependencyParserPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		parser.hooks.evaluateIdentifier.for("import.meta.webpackContext").tap(
			{ name: PLUGIN_NAME, path: true },
			evaluateToIdentifierByPath(
				"import.meta.webpackContext",
				"import.meta",
				() => ["webpackContext"],
				true
			)
		);
		parser.hooks.call
			.for("import.meta.webpackContext")
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
				const argumentCount = path.fieldCount(Field.arguments, node);
				if (argumentCount < 1 || argumentCount > 2) return;
				const directoryNode = path.field(0, Field.arguments, node);
				const optionsNode =
					argumentCount > 1 ? path.field(1, Field.arguments, node) : 0;
				if (
					optionsNode !== 0 &&
					path.type(optionsNode) !== NodeType.ObjectExpression
				) {
					return;
				}
				const requestExpr = parser.evaluateExpression(
					parser.nodeOfPath(path, directoryNode)
				);
				if (!requestExpr.isString()) return;
				const request = /** @type {string} */ (requestExpr.string);
				/** @type {WebpackError[]} */
				const errors = [];
				let regExp = /^\.\/.*$/;
				let recursive = true;
				/** @type {ContextMode} */
				let mode = "sync";
				/** @type {ContextModuleOptions["include"]} */
				let include;
				/** @type {ContextModuleOptions["exclude"]} */
				let exclude;
				/** @type {RawChunkGroupOptions} */
				const groupOptions = {};
				/** @type {ChunkName | undefined} */
				let chunkName;
				/** @type {RawReferencedExports | undefined} */
				let exports;
				if (optionsNode !== 0) {
					const optionsLoc = parser.getLocation(
						parser.nodeOfPath(path, optionsNode)
					);
					const count = path.fieldCount(Field.properties, optionsNode);
					for (let i = 0; i < count; i++) {
						const prop = path.field(i, Field.properties, optionsNode);
						const key =
							path.type(prop) === NodeType.Property
								? path.field(0, Field.key, prop)
								: 0;
						if (key === 0 || path.type(key) !== NodeType.Identifier) {
							errors.push(
								createError(
									"Parsing import.meta.webpackContext options failed.",
									optionsLoc
								)
							);
							break;
						}
						const value = parser.nodeOfPath(
							path,
							path.field(0, Field.value, prop)
						);
						const name = path.name(key);
						switch (name) {
							case "regExp": {
								const regExpExpr = parser.evaluateExpression(value);
								if (!regExpExpr.isRegExp()) {
									errors.push(
										createPropertyParseError(parser, path, prop, "RegExp")
									);
								} else {
									regExp = /** @type {RegExp} */ (regExpExpr.regExp);
								}
								break;
							}
							case "include": {
								const regExpExpr = parser.evaluateExpression(value);
								if (!regExpExpr.isRegExp()) {
									errors.push(
										createPropertyParseError(parser, path, prop, "RegExp")
									);
								} else {
									include = regExpExpr.regExp;
								}
								break;
							}
							case "exclude": {
								const regExpExpr = parser.evaluateExpression(value);
								if (!regExpExpr.isRegExp()) {
									errors.push(
										createPropertyParseError(parser, path, prop, "RegExp")
									);
								} else {
									exclude = regExpExpr.regExp;
								}
								break;
							}
							case "mode": {
								const modeExpr = parser.evaluateExpression(value);
								if (!modeExpr.isString()) {
									errors.push(
										createPropertyParseError(parser, path, prop, "string")
									);
								} else {
									mode = /** @type {ContextModuleOptions["mode"]} */ (
										modeExpr.string
									);
								}
								break;
							}
							case "chunkName": {
								const expr = parser.evaluateExpression(value);
								if (!expr.isString()) {
									errors.push(
										createPropertyParseError(parser, path, prop, "string")
									);
								} else {
									chunkName = expr.string;
								}
								break;
							}
							case "exports": {
								const expr = parser.evaluateExpression(value);
								if (expr.isString()) {
									exports = [[/** @type {string} */ (expr.string)]];
								} else if (expr.isArray()) {
									const items =
										/** @type {BasicEvaluatedExpression[]} */
										(expr.items);
									if (
										items.every((i) => {
											if (!i.isArray()) return false;
											const innerItems =
												/** @type {BasicEvaluatedExpression[]} */ (i.items);
											return innerItems.every((i) => i.isString());
										})
									) {
										exports = [];

										for (const i1 of items) {
											/** @type {string[]} */
											const export_ = [];
											for (const i2 of /** @type {BasicEvaluatedExpression[]} */ (
												i1.items
											)) {
												export_.push(/** @type {string} */ (i2.string));
											}
											exports.push(export_);
										}
									} else {
										errors.push(
											createPropertyParseError(
												parser,
												path,
												prop,
												"string|string[][]"
											)
										);
									}
								} else {
									errors.push(
										createPropertyParseError(
											parser,
											path,
											prop,
											"string|string[][]"
										)
									);
								}
								break;
							}
							case "prefetch": {
								const expr = parser.evaluateExpression(value);
								if (expr.isBoolean()) {
									groupOptions.prefetchOrder = 0;
								} else if (expr.isNumber()) {
									groupOptions.prefetchOrder = expr.number;
								} else {
									errors.push(
										createPropertyParseError(
											parser,
											path,
											prop,
											"boolean|number"
										)
									);
								}
								break;
							}
							case "preload": {
								const expr = parser.evaluateExpression(value);
								if (expr.isBoolean()) {
									groupOptions.preloadOrder = 0;
								} else if (expr.isNumber()) {
									groupOptions.preloadOrder = expr.number;
								} else {
									errors.push(
										createPropertyParseError(
											parser,
											path,
											prop,
											"boolean|number"
										)
									);
								}
								break;
							}
							case "fetchPriority": {
								const expr = parser.evaluateExpression(value);
								if (
									expr.isString() &&
									["high", "low", "auto"].includes(
										/** @type {string} */ (expr.string)
									)
								) {
									groupOptions.fetchPriority =
										/** @type {RawChunkGroupOptions["fetchPriority"]} */ (
											expr.string
										);
								} else {
									errors.push(
										createPropertyParseError(
											parser,
											path,
											prop,
											'"high"|"low"|"auto"'
										)
									);
								}
								break;
							}
							case "recursive": {
								const recursiveExpr = parser.evaluateExpression(value);
								if (!recursiveExpr.isBoolean()) {
									errors.push(
										createPropertyParseError(parser, path, prop, "boolean")
									);
								} else {
									recursive = /** @type {boolean} */ (recursiveExpr.bool);
								}
								break;
							}
							default:
								errors.push(
									createError(
										`Parsing import.meta.webpackContext options failed. Unknown property ${JSON.stringify(
											name
										)}.`,
										optionsLoc
									)
								);
						}
					}
				}
				if (errors.length) {
					for (const error of errors) parser.state.module.addError(error);
					return;
				}

				const dep = new ImportMetaContextDependency(
					{
						request,
						include,
						exclude,
						recursive,
						regExp,
						groupOptions,
						chunkName,
						referencedExports: exports,
						mode,
						category: "esm"
					},
					path.range(node)
				);
				dep.loc = parser.getLocation(parser.nodeOfPath(path, node));
				dep.optional = Boolean(parser.scope.inTry);
				parser.state.current.addDependency(dep);
				return true;
			});
	}
};
