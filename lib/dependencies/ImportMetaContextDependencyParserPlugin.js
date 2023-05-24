/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const WebpackError = require("../WebpackError");
const {
	evaluateToIdentifier
} = require("../javascript/JavascriptParserHelpers");
const ImportMetaContextDependency = require("./ImportMetaContextDependency");

/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("estree").ObjectExpression} ObjectExpression */
/** @typedef {import("estree").Property} Property */
/** @typedef {import("estree").SourceLocation} SourceLocation */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../ContextModule").ContextModuleOptions} ContextModuleOptions */
/** @typedef {import("../ChunkGroup").RawChunkGroupOptions} RawChunkGroupOptions */
/** @typedef {Pick<ContextModuleOptions, 'mode'|'recursive'|'regExp'|'include'|'exclude'|'chunkName'>&{groupOptions: RawChunkGroupOptions, exports?: ContextModuleOptions["referencedExports"]}} ImportMetaContextOptions */

/**
 * @param {TODO} prop property
 * @param {string} expect except message
 * @returns {WebpackError} error
 */
function createPropertyParseError(prop, expect) {
	return createError(
		`Parsing import.meta.webpackContext options failed. Unknown value for property ${JSON.stringify(
			prop.key.name
		)}, expected type ${expect}.`,
		prop.value.loc
	);
}

/**
 * @param {string} msg message
 * @param {SourceLocation} loc location
 * @returns {WebpackError} error
 */
function createError(msg, loc) {
	const error = new WebpackError(msg);
	error.name = "ImportMetaContextError";
	error.loc = loc;
	return error;
}

module.exports = class ImportMetaContextDependencyParserPlugin {
	/**
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		parser.hooks.evaluateIdentifier
			.for("import.meta.webpackContext")
			.tap("ImportMetaContextDependencyParserPlugin", expr => {
				return evaluateToIdentifier(
					"import.meta.webpackContext",
					"import.meta",
					() => ["webpackContext"],
					true
				)(expr);
			});
		parser.hooks.call
			.for("import.meta.webpackContext")
			.tap("ImportMetaContextDependencyParserPlugin", expr => {
				if (expr.arguments.length < 1 || expr.arguments.length > 2) return;
				const [directoryNode, optionsNode] = expr.arguments;
				if (optionsNode && optionsNode.type !== "ObjectExpression") return;
				const requestExpr = parser.evaluateExpression(
					/** @type {Expression} */ (directoryNode)
				);
				if (!requestExpr.isString()) return;
				const request = requestExpr.string;
				const errors = [];
				let regExp = /^\.\/.*$/;
				let recursive = true;
				/** @type {ContextModuleOptions["mode"]} */
				let mode = "sync";
				/** @type {ContextModuleOptions["include"]} */
				let include;
				/** @type {ContextModuleOptions["exclude"]} */
				let exclude;
				/** @type {RawChunkGroupOptions} */
				const groupOptions = {};
				/** @type {ContextModuleOptions["chunkName"]} */
				let chunkName;
				/** @type {ContextModuleOptions["referencedExports"]} */
				let exports;
				if (optionsNode) {
					for (const prop of /** @type {ObjectExpression} */ (optionsNode)
						.properties) {
						if (prop.type !== "Property" || prop.key.type !== "Identifier") {
							errors.push(
								createError(
									"Parsing import.meta.webpackContext options failed.",
									optionsNode.loc
								)
							);
							break;
						}
						switch (prop.key.name) {
							case "regExp": {
								const regExpExpr = parser.evaluateExpression(
									/** @type {Expression} */ (prop.value)
								);
								if (!regExpExpr.isRegExp()) {
									errors.push(createPropertyParseError(prop, "RegExp"));
								} else {
									regExp = regExpExpr.regExp;
								}
								break;
							}
							case "include": {
								const regExpExpr = parser.evaluateExpression(
									/** @type {Expression} */ (prop.value)
								);
								if (!regExpExpr.isRegExp()) {
									errors.push(createPropertyParseError(prop, "RegExp"));
								} else {
									include = regExpExpr.regExp;
								}
								break;
							}
							case "exclude": {
								const regExpExpr = parser.evaluateExpression(
									/** @type {Expression} */ (prop.value)
								);
								if (!regExpExpr.isRegExp()) {
									errors.push(createPropertyParseError(prop, "RegExp"));
								} else {
									exclude = regExpExpr.regExp;
								}
								break;
							}
							case "mode": {
								const modeExpr = parser.evaluateExpression(
									/** @type {Expression} */ (prop.value)
								);
								if (!modeExpr.isString()) {
									errors.push(createPropertyParseError(prop, "string"));
								} else {
									mode = /** @type {ContextModuleOptions["mode"]} */ (
										modeExpr.string
									);
								}
								break;
							}
							case "chunkName": {
								const expr = parser.evaluateExpression(
									/** @type {Expression} */ (prop.value)
								);
								if (!expr.isString()) {
									errors.push(createPropertyParseError(prop, "string"));
								} else {
									chunkName = expr.string;
								}
								break;
							}
							case "exports": {
								const expr = parser.evaluateExpression(
									/** @type {Expression} */ (prop.value)
								);
								if (expr.isString()) {
									exports = [[expr.string]];
								} else if (expr.isArray()) {
									const items = expr.items;
									if (
										items.every(i => {
											if (!i.isArray()) return false;
											const innerItems = i.items;
											return innerItems.every(i => i.isString());
										})
									) {
										exports = [];
										for (const i1 of items) {
											const export_ = [];
											for (const i2 of i1.items) {
												export_.push(i2.string);
											}
											exports.push(export_);
										}
									} else {
										errors.push(
											createPropertyParseError(prop, "string|string[][]")
										);
									}
								} else {
									errors.push(
										createPropertyParseError(prop, "string|string[][]")
									);
								}
								break;
							}
							case "prefetch": {
								const expr = parser.evaluateExpression(
									/** @type {Expression} */ (prop.value)
								);
								if (expr.isBoolean()) {
									groupOptions.prefetchOrder = 0;
								} else if (expr.isNumber()) {
									groupOptions.prefetchOrder = expr.number;
								} else {
									errors.push(createPropertyParseError(prop, "boolean|number"));
								}
								break;
							}
							case "preload": {
								const expr = parser.evaluateExpression(
									/** @type {Expression} */ (prop.value)
								);
								if (expr.isBoolean()) {
									groupOptions.preloadOrder = 0;
								} else if (expr.isNumber()) {
									groupOptions.preloadOrder = expr.number;
								} else {
									errors.push(createPropertyParseError(prop, "boolean|number"));
								}
								break;
							}
							case "fetchPriority": {
								const expr = parser.evaluateExpression(
									/** @type {Expression} */ (prop.value)
								);
								if (
									expr.isString() &&
									["high", "low", "auto"].includes(expr.string)
								) {
									groupOptions.fetchPriority =
										/** @type {RawChunkGroupOptions["fetchPriority"]} */ (
											expr.string
										);
								} else {
									errors.push(
										createPropertyParseError(prop, '"high"|"low"|"auto"')
									);
								}
								break;
							}
							case "recursive": {
								const recursiveExpr = parser.evaluateExpression(
									/** @type {Expression} */ (prop.value)
								);
								if (!recursiveExpr.isBoolean()) {
									errors.push(createPropertyParseError(prop, "boolean"));
								} else {
									recursive = recursiveExpr.bool;
								}
								break;
							}
							default:
								errors.push(
									createError(
										`Parsing import.meta.webpackContext options failed. Unknown property ${JSON.stringify(
											prop.key.name
										)}.`,
										optionsNode.loc
									)
								);
						}
					}
				}
				if (errors.length) {
					for (const error of errors) parser.state.current.addError(error);
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
					expr.range
				);
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			});
	}
};
