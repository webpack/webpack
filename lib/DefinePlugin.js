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
	return "Object({" + Object.keys(obj).map((key) => {
		const code = obj[key];
		return JSON.stringify(key) + ":" + toCode(code);
	}).join(",") + "})";
};

const toCode = code => {
	if(code === null) return "null";
	else if(code === undefined) return "undefined";
	else if(code instanceof RegExp && code.toString) return code.toString();
	else if(typeof code === "function" && code.toString) return "(" + code.toString() + ")";
	else if(typeof code === "object") return stringifyObj(code);
	else return code + "";
};

class DefinePlugin {
	constructor(definitions) {
		this.definitions = definitions;
	}

	apply(compiler) {
		const definitions = this.definitions;
		compiler.plugin("compilation", (compilation, params) => {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

			params.normalModuleFactory.plugin(["parser javascript/auto", "parser javascript/dynamic", "parser javascript/esm"], (parser) => {
				const walkDefinitions = (definitions, prefix) => {
					Object.keys(definitions).forEach((key) => {
						const code = definitions[key];
						if(code && typeof code === "object" && !(code instanceof RegExp)) {
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
						parser.plugin("can-rename " + fullKey, ParserHelpers.approve);
					});
				};

				const applyDefine = (key, code) => {
					const isTypeof = /^typeof\s+/.test(key);
					if(isTypeof) key = key.replace(/^typeof\s+/, "");
					let recurse = false;
					let recurseTypeof = false;
					code = toCode(code);
					if(!isTypeof) {
						parser.plugin("can-rename " + key, ParserHelpers.approve);
						parser.plugin("evaluate Identifier " + key, (expr) => {
							/**
							 * this is needed in case there is a recursion in the DefinePlugin
							 * to prevent an endless recursion
							 * e.g.: new DefinePlugin({
							 * "a": "b",
							 * "b": "a"
							 * });
							 */
							if(recurse) return;
							recurse = true;
							const res = parser.evaluate(code);
							recurse = false;
							res.setRange(expr.range);
							return res;
						});
						parser.plugin("expression " + key, ParserHelpers.toConstantDependency(code));
					}
					const typeofCode = isTypeof ? code : "typeof (" + code + ")";
					parser.plugin("evaluate typeof " + key, (expr) => {
						/**
						 * this is needed in case there is a recursion in the DefinePlugin
						 * to prevent an endless recursion
						 * e.g.: new DefinePlugin({
						 * "typeof a": "tyepof b",
						 * "typeof b": "typeof a"
						 * });
						 */
						if(recurseTypeof) return;
						recurseTypeof = true;
						const res = parser.evaluate(typeofCode);
						recurseTypeof = false;
						res.setRange(expr.range);
						return res;
					});
					parser.plugin("typeof " + key, (expr) => {
						const res = parser.evaluate(typeofCode);
						if(!res.isString()) return;
						return ParserHelpers.toConstantDependency(JSON.stringify(res.string)).bind(parser)(expr);
					});
				};

				const applyObjectDefine = (key, obj) => {
					const code = stringifyObj(obj);
					parser.plugin("can-rename " + key, ParserHelpers.approve);
					parser.plugin("evaluate Identifier " + key, (expr) => new BasicEvaluatedExpression().setTruthy().setRange(expr.range));
					parser.plugin("evaluate typeof " + key, ParserHelpers.evaluateToString("object"));
					parser.plugin("expression " + key, ParserHelpers.toConstantDependency(code));
					parser.plugin("typeof " + key, ParserHelpers.toConstantDependency(JSON.stringify("object")));
				};

				walkDefinitions(definitions, "");
			});
		});
	}
}
module.exports = DefinePlugin;
