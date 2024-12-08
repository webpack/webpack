/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Xie HaiJie @hai-x
*/

"use strict";

const { pathToFileURL } = require("url");
const CommentCompilationWarning = require("../CommentCompilationWarning");
const RuntimeGlobals = require("../RuntimeGlobals");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
const ConstDependency = require("../dependencies/ConstDependency");
const ContextDependencyHelpers = require("../dependencies/ContextDependencyHelpers");
const URLContextDependency = require("../dependencies/URLContextDependency");
const URLDependency = require("../dependencies/URLDependency");
const BasicEvaluatedExpression = require("../javascript/BasicEvaluatedExpression");
const { approve } = require("../javascript/JavascriptParserHelpers");
const InnerGraph = require("../optimize/InnerGraph");

/** @typedef {import("estree").MemberExpression} MemberExpression */
/** @typedef {import("estree").NewExpression} NewExpressionNode */

/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser")} Parser */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */

const PLUGIN_NAME = "URLParserPlugin";

/**
 * @param {NormalModule} module module
 * @returns {URL} file url
 */
const getUrl = module => pathToFileURL(module.resource);

/**
 * @param {Parser} parser parser parser
 * @param {MemberExpression} arg arg
 * @returns {boolean} true when it is `meta.url`, otherwise false
 */
const isMetaUrl = (parser, arg) => {
	const chain = parser.extractMemberExpressionChain(arg);

	if (
		chain.members.length !== 1 ||
		chain.object.type !== "MetaProperty" ||
		chain.object.meta.name !== "import" ||
		chain.object.property.name !== "meta" ||
		chain.members[0] !== "url"
	)
		return false;

	return true;
};

/**
 * @param {NewExpressionNode} expr expression
 * @param {Parser} parser parser parser
 * @returns {BasicEvaluatedExpression | undefined} basicEvaluatedExpression
 */
const getEvaluatedExp = (expr, parser) => {
	if (expr.arguments.length !== 2) return;

	const [arg1, arg2] = expr.arguments;

	if (arg2.type !== "MemberExpression" || arg1.type === "SpreadElement") return;

	if (!isMetaUrl(parser, arg2)) return;

	return parser.evaluateExpression(arg1);
};

class URLParserPlugin {
	/**
	 * @param {JavascriptParserOptions} options options
	 */
	constructor(options) {
		this.options = options;
	}

	/**
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		const relative = this.options.url === "relative";

		parser.hooks.canRename.for("URL").tap(PLUGIN_NAME, approve);
		parser.hooks.evaluateNewExpression.for("URL").tap(PLUGIN_NAME, expr => {
			const evaluatedExp = getEvaluatedExp(expr, parser);
			const request = evaluatedExp && evaluatedExp.asString();
			if (!request) return;
			const url = new URL(request, getUrl(parser.state.module));

			return new BasicEvaluatedExpression()
				.setString(url.toString())
				.setRange(/** @type {Range} */ (expr.range));
		});
		parser.hooks.new.for("URL").tap(PLUGIN_NAME, _expr => {
			const expr = /** @type {NewExpressionNode} */ (_expr);
			const { options: importOptions, errors: commentErrors } =
				parser.parseCommentOptions(/** @type {Range} */ (expr.range));

			if (commentErrors) {
				for (const e of commentErrors) {
					const { comment } = e;
					parser.state.module.addWarning(
						new CommentCompilationWarning(
							`Compilation error while processing magic comment(-s): /*${comment.value}*/: ${e.message}`,
							/** @type {DependencyLocation} */ (comment.loc)
						)
					);
				}
			}

			if (importOptions && importOptions.webpackIgnore !== undefined) {
				if (typeof importOptions.webpackIgnore !== "boolean") {
					parser.state.module.addWarning(
						new UnsupportedFeatureWarning(
							`\`webpackIgnore\` expected a boolean, but received: ${importOptions.webpackIgnore}.`,
							/** @type {DependencyLocation} */ (expr.loc)
						)
					);
					return;
				} else if (importOptions.webpackIgnore) {
					if (expr.arguments.length !== 2) return;

					const [, arg2] = expr.arguments;

					if (arg2.type !== "MemberExpression" || !isMetaUrl(parser, arg2))
						return;

					const dep = new ConstDependency(
						RuntimeGlobals.baseURI,
						/** @type {Range} */ (arg2.range),
						[RuntimeGlobals.baseURI]
					);
					dep.loc = /** @type {DependencyLocation} */ (expr.loc);
					parser.state.module.addPresentationalDependency(dep);

					return true;
				}
			}

			const evaluatedExp = getEvaluatedExp(expr, parser);
			if (!evaluatedExp) return;

			let request;
			if ((request = evaluatedExp.asString())) {
				const [arg1, arg2] = expr.arguments;
				const dep = new URLDependency(
					request,
					[
						/** @type {Range} */ (arg1.range)[0],
						/** @type {Range} */ (arg2.range)[1]
					],
					/** @type {Range} */ (expr.range),
					relative
				);
				dep.loc = /** @type {DependencyLocation} */ (expr.loc);
				parser.state.current.addDependency(dep);
				InnerGraph.onUsage(parser.state, e => (dep.usedByExports = e));
				return true;
			}

			const dep = ContextDependencyHelpers.create(
				URLContextDependency,
				/** @type {Range} */ (expr.range),
				evaluatedExp,
				expr,
				this.options,
				{
					category: "url"
				},
				parser
			);
			if (!dep) return;
			dep.loc = /** @type {DependencyLocation} */ (expr.loc);
			dep.optional = Boolean(parser.scope.inTry);
			parser.state.current.addDependency(dep);
			return true;
		});
		parser.hooks.isPure.for("NewExpression").tap(PLUGIN_NAME, _expr => {
			const expr = /** @type {NewExpressionNode} */ (_expr);
			const { callee } = expr;
			if (callee.type !== "Identifier") return;
			const calleeInfo = parser.getFreeInfoFromVariable(callee.name);
			if (!calleeInfo || calleeInfo.name !== "URL") return;

			const evaluatedExp = getEvaluatedExp(expr, parser);
			const request = evaluatedExp && evaluatedExp.asString();

			if (request) return true;
		});
	}
}

module.exports = URLParserPlugin;
