/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConstDependency = require("./dependencies/ConstDependency");
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const ParserHelpers = require("./ParserHelpers");
const NullFactory = require("./NullFactory");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Parser")} Parser */
/** @typedef {null|undefined|RegExp|Function|Object} CodeValue */

/**
 * Stringify an object
 * @param {Object} obj Object to stringify
 * @returns {string} Stringified object
 */
const stringifyObj = obj => {
	return (
		"Object({" +
		Object.keys(obj)
			.map(key => {
				const code = obj[key];
				return JSON.stringify(key) + ":" + toCode(code);
			})
			.join(",") +
		"})"
	);
};

/**
 * Convert code to a string that evaluates
 * @param {CodeValue} code Code to evaluate
 * @returns {string} code converted to string that evaluates
 */
const toCode = code => {
	if (code === null) {
		return "null";
	}
	if (code === undefined) {
		return "undefined";
	}
	if (code instanceof RegExp && code.toString) {
		return code.toString();
	}
	if (typeof code === "function" && code.toString) {
		return "(" + code.toString() + ")";
	}
	if (typeof code === "object") {
		return stringifyObj(code);
	}
	return code + "";
};

class DefinePlugin {
	/**
	 * Create a new define plugin
	 * @param {Object} definitions A map of global object definitions
	 */
	constructor(definitions) {
		this.definitions = definitions;
	}

	/**
	 * @param {Compiler} compiler Webpack Compiler
	 * @returns {void}
	 */
	apply(compiler) {
		const definitions = this.definitions;
		compiler.hooks.compilation.tap(
			"DefinePlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(ConstDependency, new NullFactory());
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);

				/**
				 * Handler
				 * @param {Parser} parser Parser
				 * @returns {void}
				 */
				const handler = parser => {
					/**
					 * Walk definitions
					 * @param {Object} definitions Definitions map
					 * @param {string} prefix Prefix string
					 * @returns {void}
					 */
					const walkDefinitions = (definitions, prefix) => {
						Object.keys(definitions).forEach(key => {
							const code = definitions[key];
							if (
								code &&
								typeof code === "object" &&
								!(code instanceof RegExp)
							) {
								walkDefinitions(code, prefix + key + ".");
								applyObjectDefine(prefix + key, code);
								return;
							}
							applyDefineKey(prefix, key);
							applyDefine(prefix + key, code);
						});
					};

					/**
					 * Apply define key
					 * @param {string} prefix Prefix
					 * @param {string} key Key
					 * @returns {void}
					 */
					const applyDefineKey = (prefix, key) => {
						const splittedKey = key.split(".");
						splittedKey.slice(1).forEach((_, i) => {
							const fullKey = prefix + splittedKey.slice(0, i + 1).join(".");
							parser.hooks.canRename
								.for(fullKey)
								.tap("DefinePlugin", ParserHelpers.approve);
						});
					};

					/**
					 * Apply Code
					 * @param {string} key Key
					 * @param {CodeValue} code Code
					 * @returns {void}
					 */
					const applyDefine = (key, code) => {
						const isTypeof = /^typeof\s+/.test(key);
						if (isTypeof) key = key.replace(/^typeof\s+/, "");
						let recurse = false;
						let recurseTypeof = false;
						code = toCode(code);
						if (!isTypeof) {
							parser.hooks.canRename
								.for(key)
								.tap("DefinePlugin", ParserHelpers.approve);
							parser.hooks.evaluateIdentifier
								.for(key)
								.tap("DefinePlugin", expr => {
									/**
									 * this is needed in case there is a recursion in the DefinePlugin
									 * to prevent an endless recursion
									 * e.g.: new DefinePlugin({
									 * "a": "b",
									 * "b": "a"
									 * });
									 */
									if (recurse) return;
									recurse = true;
									const res = parser.evaluate(code);
									recurse = false;
									res.setRange(expr.range);
									return res;
								});
							parser.hooks.expression
								.for(key)
								.tap(
									"DefinePlugin",
									/__webpack_require__/.test(code)
										? ParserHelpers.toConstantDependencyWithWebpackRequire(
												parser,
												code
										  )
										: ParserHelpers.toConstantDependency(parser, code)
								);
						}
						const typeofCode = isTypeof ? code : "typeof (" + code + ")";
						parser.hooks.evaluateTypeof.for(key).tap("DefinePlugin", expr => {
							/**
							 * this is needed in case there is a recursion in the DefinePlugin
							 * to prevent an endless recursion
							 * e.g.: new DefinePlugin({
							 * "typeof a": "typeof b",
							 * "typeof b": "typeof a"
							 * });
							 */
							if (recurseTypeof) return;
							recurseTypeof = true;
							const res = parser.evaluate(typeofCode);
							recurseTypeof = false;
							res.setRange(expr.range);
							return res;
						});
						parser.hooks.typeof.for(key).tap("DefinePlugin", expr => {
							const res = parser.evaluate(typeofCode);
							if (!res.isString()) return;
							return ParserHelpers.toConstantDependency(
								parser,
								JSON.stringify(res.string)
							).bind(parser)(expr);
						});
					};

					/**
					 * Apply Object
					 * @param {string} key Key
					 * @param {Object} obj Object
					 * @returns {void}
					 */
					const applyObjectDefine = (key, obj) => {
						const code = stringifyObj(obj);
						parser.hooks.canRename
							.for(key)
							.tap("DefinePlugin", ParserHelpers.approve);
						parser.hooks.evaluateIdentifier
							.for(key)
							.tap("DefinePlugin", expr =>
								new BasicEvaluatedExpression().setTruthy().setRange(expr.range)
							);
						parser.hooks.evaluateTypeof
							.for(key)
							.tap("DefinePlugin", ParserHelpers.evaluateToString("object"));
						parser.hooks.expression
							.for(key)
							.tap(
								"DefinePlugin",
								/__webpack_require__/.test(code)
									? ParserHelpers.toConstantDependencyWithWebpackRequire(
											parser,
											code
									  )
									: ParserHelpers.toConstantDependency(parser, code)
							);
						parser.hooks.typeof
							.for(key)
							.tap(
								"DefinePlugin",
								ParserHelpers.toConstantDependency(
									parser,
									JSON.stringify("object")
								)
							);
					};

					walkDefinitions(definitions, "");
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("DefinePlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("DefinePlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("DefinePlugin", handler);
			}
		);
	}
}
module.exports = DefinePlugin;
