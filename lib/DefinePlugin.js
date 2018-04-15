/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConstDependency = require("./dependencies/ConstDependency");
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const ParserHelpers = require("./ParserHelpers");
const NullFactory = require("./NullFactory");

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

const codeToValue = code => {
	return new Function("return " + code)();
};

const toCode = code => {
	if (code === null) return "null";
	else if (code === undefined) return "undefined";
	else if (code instanceof RegExp && code.toString) return code.toString();
	else if (typeof code === "function" && code.toString)
		return "(" + code.toString() + ")";
	else if (typeof code === "object") return stringifyObj(code);
	else return code + "";
};

class DefinePlugin {
	constructor(definitions) {
		this.definitions = definitions;
	}
	addDefinitionToContext(defineKey, code, context) {
		const splittedKey = defineKey.split(".");
		const value = codeToValue(code);
		let currentContext = context;
		splittedKey.forEach((key, i) => {
			if (i === splittedKey.length - 1) {
				currentContext[key] = value;
			} else {
				if (typeof currentContext[key] !== "object") {
					currentContext[key] = {};
				}
				currentContext = currentContext[key];
			}
		});
	}
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

				const handler = parser => {
					const resolvedDefinitions = {};

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

					const applyDefineKey = (prefix, key) => {
						const splittedKey = key.split(".");
						splittedKey.slice(1).forEach((_, i) => {
							const fullKey = prefix + splittedKey.slice(0, i + 1).join(".");
							parser.hooks.canRename
								.for(fullKey)
								.tap("DefinePlugin", ParserHelpers.approve);
						});
					};

					const applyDefine = (key, code) => {
						const isTypeof = /^typeof\s+/.test(key);
						if (isTypeof) key = key.replace(/^typeof\s+/, "");
						let recurse = false;
						let recurseTypeof = false;
						code = toCode(code);
						resolvedDefinitions[key] = code;
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

					const applyObjectDefine = (key, obj) => {
						const code = stringifyObj(obj);
						resolvedDefinitions[key] = code;
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

					parser.hooks.commentOptions.tap(
						"DefinePlugin",
						(comment, context) => {
							Object.keys(resolvedDefinitions).forEach(key => {
								this.addDefinitionToContext(
									key,
									resolvedDefinitions[key],
									context
								);
							});
						}
					);
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
