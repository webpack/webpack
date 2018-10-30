/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ContextDependencyHelpers = exports;

/**
 * Escapes regular expression metacharacters
 * @param {string} str String to quote
 * @returns {string} Escaped string
 */
const quotemeta = str => {
	return str.replace(/[-[\]\\/{}()*+?.^$|]/g, "\\$&");
};

const splitContextFromPrefix = prefix => {
	const idx = prefix.lastIndexOf("/");
	let context = ".";
	if (idx >= 0) {
		context = prefix.substr(0, idx);
		prefix = `.${prefix.substr(idx)}`;
	}
	return {
		context,
		prefix
	};
};

const splitQueryFromPostfix = postfix => {
	const idx = postfix.indexOf("?");
	let query = "";
	if (idx >= 0) {
		query = postfix.substr(idx);
		postfix = postfix.substr(0, idx);
	}
	return {
		postfix,
		query
	};
};

ContextDependencyHelpers.create = (
	Dep,
	range,
	param,
	expr,
	options,
	contextOptions,
	// when parser is not passed in, expressions won't be walked
	parser = null
) => {
	if (param.isTemplateString()) {
		let prefixRaw = param.quasis[0].string;
		let postfixRaw =
			param.quasis.length > 1
				? param.quasis[param.quasis.length - 1].string
				: "";
		const prefixRange = [param.quasis[0].range[0], param.quasis[0].range[1]];
		const postfixRange =
			param.quasis.length > 1
				? param.quasis[param.quasis.length - 1].range
				: "";
		const valueRange = param.range;
		const { context, prefix } = splitContextFromPrefix(prefixRaw);
		const { postfix, query } = splitQueryFromPostfix(postfixRaw);
		// If there are more than two quasis, maybe the generated RegExp can be more precise?
		const regExp = new RegExp(
			`^${quotemeta(prefix)}${options.wrappedContextRegExp.source}${quotemeta(
				postfix
			)}$`
		);
		const dep = new Dep(
			Object.assign(
				{
					request: context + query,
					recursive: options.wrappedContextRecursive,
					regExp,
					mode: "sync"
				},
				contextOptions
			),
			range,
			valueRange
		);
		dep.loc = expr.loc;
		const replaces = [];

		if (parser) {
			let paramExpr = param.expression;
			while (paramExpr.type !== "TemplateLiteral") {
				if (paramExpr.type === "ConditionalExpression") {
					const test = parser.evaluateExpression(paramExpr.test);
					let replace;
					if (test.asBool()) {
						replace = paramExpr.alternate;
						paramExpr = paramExpr.consequent;
					} else {
						replace = paramExpr.consequent;
						paramExpr = paramExpr.alternate;
					}
					replaces.push({
						range: replace.range,
						value: JSON.stringify("")
					});
				} else if (paramExpr.type === "TaggedTemplateExpression") {
					paramExpr = paramExpr.quasi;
				} else {
					break; // there are other cases, just ignore for now
				}
			}
			param.parts.forEach(part => {
				if (
					part.range[0] > prefixRange[1] &&
					(!postfixRange || part.range[1] < postfixRange[0])
				) {
					if (part.isString()) {
						replaces.push({
							range: part.range,
							value: part.string
						});
					} else {
						parser.walkExpression(part.expression);
					}
				}
			});
		}

		// replace even prefix === prefixRaw as it's evaluated
		replaces.push({
			range: prefixRange,
			value: prefix
		});
		// replace even postfix === postfixRaw as it's evaluated
		if (postfixRange) {
			replaces.push({
				range: postfixRange,
				value: postfix
			});
		}
		dep.replaces = replaces;
		dep.critical =
			options.wrappedContextCritical &&
			"a part of the request of a dependency is an expression";
		return dep;
	} else if (
		param.isWrapped() &&
		((param.prefix && param.prefix.isString()) ||
			(param.postfix && param.postfix.isString()))
	) {
		let prefixRaw =
			param.prefix && param.prefix.isString() ? param.prefix.string : "";
		let postfixRaw =
			param.postfix && param.postfix.isString() ? param.postfix.string : "";
		const prefixRange =
			param.prefix && param.prefix.isString() ? param.prefix.range : null;
		const postfixRange =
			param.postfix && param.postfix.isString() ? param.postfix.range : null;
		const valueRange = param.range;
		const { context, prefix } = splitContextFromPrefix(prefixRaw);
		const { postfix, query } = splitQueryFromPostfix(postfixRaw);
		const regExp = new RegExp(
			`^${quotemeta(prefix)}${options.wrappedContextRegExp.source}${quotemeta(
				postfix
			)}$`
		);
		const dep = new Dep(
			Object.assign(
				{
					request: context + query,
					recursive: options.wrappedContextRecursive,
					regExp,
					mode: "sync"
				},
				contextOptions
			),
			range,
			valueRange
		);
		dep.loc = expr.loc;
		const replaces = [];
		if (prefixRange && prefix !== prefixRaw) {
			replaces.push({
				range: prefixRange,
				value: JSON.stringify(prefix)
			});
		}
		if (postfixRange && postfix !== postfixRaw) {
			replaces.push({
				range: postfixRange,
				value: JSON.stringify(postfix)
			});
		}
		dep.replaces = replaces;
		dep.critical =
			options.wrappedContextCritical &&
			"a part of the request of a dependency is an expression";
		return dep;
	} else {
		const dep = new Dep(
			Object.assign(
				{
					request: options.exprContextRequest,
					recursive: options.exprContextRecursive,
					regExp: options.exprContextRegExp,
					mode: "sync"
				},
				contextOptions
			),
			range,
			param.range
		);
		dep.loc = expr.loc;
		dep.critical =
			options.exprContextCritical &&
			"the request of a dependency is an expression";

		if (parser) {
			parser.walkExpression(param.expression);
		}

		return dep;
	}
};
