/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
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
/** @typedef {import("../ContextModule").ContextMode} ContextMode */
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
const getUrl = (module) => pathToFileURL(module.resource);

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
	) {
		return false;
	}

	return true;
};

/**
 * @type {WeakMap<NewExpressionNode, BasicEvaluatedExpression | undefined>}
 */
const getEvaluatedExprCache = new WeakMap();

/**
 * @param {NewExpressionNode} expr expression
 * @param {Parser} parser parser parser
 * @returns {BasicEvaluatedExpression | undefined} basic evaluated expression
 */
const getEvaluatedExpr = (expr, parser) => {
	let result = getEvaluatedExprCache.get(expr);
	if (result !== undefined) return result;

	/**
	 * @returns {BasicEvaluatedExpression | undefined} basic evaluated expression
	 */
	const evaluate = () => {
		if (expr.arguments.length !== 2) return;

		const [arg1, arg2] = expr.arguments;

		if (arg2.type !== "MemberExpression" || arg1.type === "SpreadElement") {
			return;
		}
		if (!isMetaUrl(parser, arg2)) return;

		return parser.evaluateExpression(arg1);
	};

	result = evaluate();
	getEvaluatedExprCache.set(expr, result);

	return result;
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
		parser.hooks.evaluateNewExpression.for("URL").tap(PLUGIN_NAME, (expr) => {
			const evaluatedExpr = getEvaluatedExpr(expr, parser);
			const request = evaluatedExpr && evaluatedExpr.asString();

			if (!request) return;
			const url = new URL(request, getUrl(parser.state.module));

			return new BasicEvaluatedExpression()
				.setString(url.toString())
				.setRange(/** @type {Range} */ (expr.range));
		});
		parser.hooks.new.for("URL").tap(PLUGIN_NAME, (_expr) => {
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

					if (arg2.type !== "MemberExpression" || !isMetaUrl(parser, arg2)) {
						return;
					}

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

			const evaluatedExpr = getEvaluatedExpr(expr, parser);
			if (!evaluatedExpr) return;

			let request;

			// static URL
			if ((request = evaluatedExpr.asString())) {
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

				// Process magic comments for prefetch/preload hints
				if (importOptions) {
					// webpackPrefetch should be boolean true
					if (
						importOptions.webpackPrefetch !== undefined &&
						importOptions.webpackPrefetch !== true
					) {
						parser.state.module.addWarning(
							new UnsupportedFeatureWarning(
								`\`webpackPrefetch\` expected true, but received: ${importOptions.webpackPrefetch}.`,
								/** @type {DependencyLocation} */ (expr.loc)
							)
						);
					}

					// webpackPreload should be boolean true
					if (
						importOptions.webpackPreload !== undefined &&
						importOptions.webpackPreload !== true
					) {
						parser.state.module.addWarning(
							new UnsupportedFeatureWarning(
								`\`webpackPreload\` expected true, but received: ${importOptions.webpackPreload}.`,
								/** @type {DependencyLocation} */ (expr.loc)
							)
						);
					}

					// webpackFetchPriority should be one of: high, low, auto
					if (
						importOptions.webpackFetchPriority !== undefined &&
						(typeof importOptions.webpackFetchPriority !== "string" ||
							!["high", "low", "auto"].includes(
								importOptions.webpackFetchPriority
							))
					) {
						parser.state.module.addWarning(
							new UnsupportedFeatureWarning(
								`\`webpackFetchPriority\` expected "low", "high" or "auto", but received: ${importOptions.webpackFetchPriority}.`,
								/** @type {DependencyLocation} */ (expr.loc)
							)
						);
					}

					// webpackPreloadAs should be a string
					if (
						importOptions.webpackPreloadAs !== undefined &&
						typeof importOptions.webpackPreloadAs !== "string"
					) {
						parser.state.module.addWarning(
							new UnsupportedFeatureWarning(
								`\`webpackPreloadAs\` expected a string, but received: ${importOptions.webpackPreloadAs}.`,
								/** @type {DependencyLocation} */ (expr.loc)
							)
						);
					}

					// webpackPreloadType should be a string
					if (
						importOptions.webpackPreloadType !== undefined &&
						typeof importOptions.webpackPreloadType !== "string"
					) {
						parser.state.module.addWarning(
							new UnsupportedFeatureWarning(
								`\`webpackPreloadType\` expected a string, but received: ${importOptions.webpackPreloadType}.`,
								/** @type {DependencyLocation} */ (expr.loc)
							)
						);
					}

					// Store magic comment values on dependency
					dep.prefetch = importOptions.webpackPrefetch;
					dep.preload = importOptions.webpackPreload;
					dep.fetchPriority = importOptions.webpackFetchPriority;
					dep.preloadAs = importOptions.webpackPreloadAs;
					dep.preloadType = importOptions.webpackPreloadType;
				}

				// Register the dependency
				parser.state.current.addDependency(dep);
				InnerGraph.onUsage(parser.state, (e) => (dep.usedByExports = e));
				return true;
			}

			if (this.options.dynamicUrl === false) return;

			// context URL
			let include;
			let exclude;

			if (importOptions) {
				if (importOptions.webpackInclude !== undefined) {
					if (
						!importOptions.webpackInclude ||
						!(importOptions.webpackInclude instanceof RegExp)
					) {
						parser.state.module.addWarning(
							new UnsupportedFeatureWarning(
								`\`webpackInclude\` expected a regular expression, but received: ${importOptions.webpackInclude}.`,
								/** @type {DependencyLocation} */ (expr.loc)
							)
						);
					} else {
						include = importOptions.webpackInclude;
					}
				}
				if (importOptions.webpackExclude !== undefined) {
					if (
						!importOptions.webpackExclude ||
						!(importOptions.webpackExclude instanceof RegExp)
					) {
						parser.state.module.addWarning(
							new UnsupportedFeatureWarning(
								`\`webpackExclude\` expected a regular expression, but received: ${importOptions.webpackExclude}.`,
								/** @type {DependencyLocation} */ (expr.loc)
							)
						);
					} else {
						exclude = importOptions.webpackExclude;
					}
				}
			}
			const dep = ContextDependencyHelpers.create(
				URLContextDependency,
				/** @type {Range} */ (expr.range),
				evaluatedExpr,
				expr,
				this.options,
				{
					include,
					exclude,
					mode: "sync",
					typePrefix: "new URL with import.meta.url",
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
		parser.hooks.isPure.for("NewExpression").tap(PLUGIN_NAME, (_expr) => {
			const expr = /** @type {NewExpressionNode} */ (_expr);
			const { callee } = expr;
			if (callee.type !== "Identifier") return;
			const calleeInfo = parser.getFreeInfoFromVariable(callee.name);
			if (!calleeInfo || calleeInfo.name !== "URL") return;

			const evaluatedExpr = getEvaluatedExpr(expr, parser);
			const request = evaluatedExpr && evaluatedExpr.asString();

			if (request) return true;
		});
	}
}

module.exports = URLParserPlugin;
