/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConstDependency = require("./dependencies/ConstDependency");
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const ParserHelpers = require("./ParserHelpers");
const NullFactory = require("./NullFactory");

class RuntimeValue {
	constructor(fn, fileDependencies) {
		this.fn = fn;
		this.fileDependencies = fileDependencies || [];
	}

	exec(parser) {
		for (const fileDependency of this.fileDependencies) {
			parser.state.module.buildInfo.fileDependencies.add(fileDependency);
		}

		return this.fn();
	}
}

class CodeMaker {
	constructor(parser) {
		this.parser = parser;
		this._definitionsMap = new Map();
	}
	stringifyObj(obj) {
		return (
			"Object({" +
			Object.keys(obj)
				.map(key => {
					const code = obj[key];
					return JSON.stringify(key) + ":" + this.toCode(code);
				})
				.join(",") +
			"})"
		);
	}
	toCode(code) {
		const parser = this.parser;
		if (code === null) {
			return "null";
		}
		if (code === undefined) {
			return "undefined";
		}
		if (code instanceof RuntimeValue) {
			return this.toCode(code.exec(parser));
		}
		if (code instanceof RegExp && code.toString) {
			return code.toString();
		}
		if (typeof code === "function" && code.toString) {
			return "(" + code.toString() + ")";
		}
		if (typeof code === "object") {
			return this.stringifyObj(code);
		}
		return code + "";
	}
	make(key, code) {
		const strCode = this.toCode(code);
		this._definitionsMap.set(key, strCode);
		return strCode;
	}
	getResolvedDefinitions() {
		return this._definitionsMap;
	}
}

class DefinePlugin {
	constructor(definitions) {
		this.definitions = definitions;
	}
	addDefinitionToContext(defineKey, code, context) {
		const splittedKey = defineKey.split(".");
		const value = new Function("return " + code)();
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

	static runtimeValue(fn, fileDependencies) {
		return new RuntimeValue(fn, fileDependencies);
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
					const codeMaker = new CodeMaker(parser);

					const walkDefinitions = (definitions, prefix) => {
						Object.keys(definitions).forEach(key => {
							const code = definitions[key];
							if (
								code &&
								typeof code === "object" &&
								!(code instanceof RuntimeValue) &&
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
									const res = parser.evaluate(codeMaker.make(key, code));
									recurse = false;
									res.setRange(expr.range);
									return res;
								});
							parser.hooks.expression.for(key).tap("DefinePlugin", expr => {
								const strCode = codeMaker.make(key, code);
								if (/__webpack_require__/.test(strCode)) {
									return ParserHelpers.toConstantDependencyWithWebpackRequire(
										parser,
										strCode
									)(expr);
								} else {
									return ParserHelpers.toConstantDependency(parser, strCode)(
										expr
									);
								}
							});
						}
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
							const strCode = codeMaker.make(key, code);
							const typeofCode = isTypeof
								? strCode
								: "typeof (" + strCode + ")";
							const res = parser.evaluate(typeofCode);
							recurseTypeof = false;
							res.setRange(expr.range);
							return res;
						});
						parser.hooks.typeof.for(key).tap("DefinePlugin", expr => {
							const strCode = codeMaker.make(key, code);
							const typeofCode = isTypeof
								? strCode
								: "typeof (" + strCode + ")";
							const res = parser.evaluate(typeofCode);
							if (!res.isString()) return;
							return ParserHelpers.toConstantDependency(
								parser,
								JSON.stringify(res.string)
							).bind(parser)(expr);
						});
					};

					const applyObjectDefine = (key, obj) => {
						parser.hooks.canRename
							.for(key)
							.tap("DefinePlugin", ParserHelpers.approve);
						parser.hooks.evaluateIdentifier
							.for(key)
							.tap("DefinePlugin", expr =>
								new BasicEvaluatedExpression().setTruthy().setRange(expr.range)
							);
						parser.hooks.evaluateTypeof.for(key).tap("DefinePlugin", expr => {
							return ParserHelpers.evaluateToString("object")(expr);
						});
						parser.hooks.expression.for(key).tap("DefinePlugin", expr => {
							const strCode = codeMaker.make(key, obj);

							if (/__webpack_require__/.test(strCode)) {
								return ParserHelpers.toConstantDependencyWithWebpackRequire(
									parser,
									strCode
								)(expr);
							} else {
								return ParserHelpers.toConstantDependency(parser, strCode)(
									expr
								);
							}
						});
						parser.hooks.typeof.for(key).tap("DefinePlugin", expr => {
							return ParserHelpers.toConstantDependency(
								parser,
								JSON.stringify("object")
							)(expr);
						});
					};

					walkDefinitions(definitions, "");

					parser.hooks.commentOptions.tap(
						"DefinePlugin",
						(comment, context) => {
							codeMaker.getResolvedDefinitions().forEach((code, key) => {
								this.addDefinitionToContext(key, code, context);
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
