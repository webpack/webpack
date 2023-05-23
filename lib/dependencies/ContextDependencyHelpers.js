/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { parseResource } = require("../util/identifier");

/** @typedef {import("estree").Node} EsTreeNode */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../../declarations/WebpackOptions").ModuleOptionsNormalized} ModuleOptions */
/** @typedef {import("../javascript/BasicEvaluatedExpression")} BasicEvaluatedExpression */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("./ContextDependency")} ContextDependency */
/** @typedef {import("./ContextDependency").ContextDependencyOptions} ContextDependencyOptions */

/**
 * Escapes regular expression metacharacters
 * @param {string} str String to quote
 * @returns {string} Escaped string
 */
const quoteMeta = str => {
	return str.replace(/[-[\]\\/{}()*+?.^$|]/g, "\\$&");
};

const splitContextFromPrefix = prefix => {
	const idx = prefix.lastIndexOf("/");
	let context = ".";
	if (idx >= 0) {
		context = prefix.slice(0, idx);
		prefix = `.${prefix.slice(idx)}`;
	}
	return {
		context,
		prefix
	};
};

/** @typedef {Partial<Omit<ContextDependencyOptions, "resource">>} PartialContextDependencyOptions */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {{ new(options: ContextDependencyOptions, range: Range, valueRange: [number, number], ...args: any[]): ContextDependency }} ContextDependencyConstructor */

/**
 * @param {ContextDependencyConstructor} Dep the Dependency class
 * @param {Range} range source range
 * @param {BasicEvaluatedExpression} param context param
 * @param {EsTreeNode} expr expr
 * @param {Pick<JavascriptParserOptions, `${"expr"|"wrapped"}Context${"Critical"|"Recursive"|"RegExp"}` | "exprContextRequest">} options options for context creation
 * @param {PartialContextDependencyOptions} contextOptions options for the ContextModule
 * @param {JavascriptParser} parser the parser
 * @param {...any} depArgs depArgs
 * @returns {ContextDependency} the created Dependency
 */
exports.create = (
	Dep,
	range,
	param,
	expr,
	options,
	contextOptions,
	parser,
	...depArgs
) => {
	if (param.isTemplateString()) {
		let prefixRaw = param.quasis[0].string;
		let postfixRaw =
			param.quasis.length > 1
				? param.quasis[param.quasis.length - 1].string
				: "";

		const valueRange = param.range;
		const { context, prefix } = splitContextFromPrefix(prefixRaw);
		const {
			path: postfix,
			query,
			fragment
		} = parseResource(postfixRaw, parser);

		// When there are more than two quasis, the generated RegExp can be more precise
		// We join the quasis with the expression regexp
		const innerQuasis = param.quasis.slice(1, param.quasis.length - 1);
		const innerRegExp =
			options.wrappedContextRegExp.source +
			innerQuasis
				.map(q => quoteMeta(q.string) + options.wrappedContextRegExp.source)
				.join("");

		// Example: `./context/pre${e}inner${e}inner2${e}post?query#frag`
		// context: "./context"
		// prefix: "./pre"
		// innerQuasis: [BEE("inner"), BEE("inner2")]
		// (BEE = BasicEvaluatedExpression)
		// postfix: "post"
		// query: "?query"
		// fragment: "#frag"
		// regExp: /^\.\/pre.*inner.*inner2.*post$/
		const regExp = new RegExp(
			`^${quoteMeta(prefix)}${innerRegExp}${quoteMeta(postfix)}$`
		);
		const dep = new Dep(
			{
				request: context + query + fragment,
				recursive: options.wrappedContextRecursive,
				regExp,
				mode: "sync",
				...contextOptions
			},
			range,
			valueRange,
			...depArgs
		);
		dep.loc = expr.loc;
		const replaces = [];

		param.parts.forEach((part, i) => {
			if (i % 2 === 0) {
				// Quasis or merged quasi
				let range = part.range;
				let value = part.string;
				if (param.templateStringKind === "cooked") {
					value = JSON.stringify(value);
					value = value.slice(1, value.length - 1);
				}
				if (i === 0) {
					// prefix
					value = prefix;
					range = [param.range[0], part.range[1]];
					value =
						(param.templateStringKind === "cooked" ? "`" : "String.raw`") +
						value;
				} else if (i === param.parts.length - 1) {
					// postfix
					value = postfix;
					range = [part.range[0], param.range[1]];
					value = value + "`";
				} else if (
					part.expression &&
					part.expression.type === "TemplateElement" &&
					part.expression.value.raw === value
				) {
					// Shortcut when it's a single quasi and doesn't need to be replaced
					return;
				}
				replaces.push({
					range,
					value
				});
			} else {
				// Expression
				parser.walkExpression(part.expression);
			}
		});

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
		const {
			path: postfix,
			query,
			fragment
		} = parseResource(postfixRaw, parser);
		const regExp = new RegExp(
			`^${quoteMeta(prefix)}${options.wrappedContextRegExp.source}${quoteMeta(
				postfix
			)}$`
		);
		const dep = new Dep(
			{
				request: context + query + fragment,
				recursive: options.wrappedContextRecursive,
				regExp,
				mode: "sync",
				...contextOptions
			},
			range,
			valueRange,
			...depArgs
		);
		dep.loc = expr.loc;
		const replaces = [];
		if (prefixRange) {
			replaces.push({
				range: prefixRange,
				value: JSON.stringify(prefix)
			});
		}
		if (postfixRange) {
			replaces.push({
				range: postfixRange,
				value: JSON.stringify(postfix)
			});
		}
		dep.replaces = replaces;
		dep.critical =
			options.wrappedContextCritical &&
			"a part of the request of a dependency is an expression";

		if (parser && param.wrappedInnerExpressions) {
			for (const part of param.wrappedInnerExpressions) {
				if (part.expression) parser.walkExpression(part.expression);
			}
		}

		return dep;
	} else {
		const dep = new Dep(
			{
				request: options.exprContextRequest,
				recursive: options.exprContextRecursive,
				regExp: /** @type {RegExp} */ (options.exprContextRegExp),
				mode: "sync",
				...contextOptions
			},
			range,
			param.range,
			...depArgs
		);
		dep.loc = expr.loc;
		dep.critical =
			options.exprContextCritical &&
			"the request of a dependency is an expression";

		parser.walkExpression(param.expression);

		return dep;
	}
};
