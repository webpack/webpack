/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const { pathToFileURL } = require("url");
const RuntimeGlobals = require("../RuntimeGlobals");
const ConstDependency = require("../dependencies/ConstDependency");
const ContextDependencyHelpers = require("../dependencies/ContextDependencyHelpers");
const {
	isImportMetaFieldEnabled
} = require("../dependencies/ImportMetaPlugin");
const URLContextDependency = require("../dependencies/URLContextDependency");
const URLDependency = require("../dependencies/URLDependency");
const CommentCompilationWarning = require("../errors/CommentCompilationWarning");
const UnsupportedFeatureWarning = require("../errors/UnsupportedFeatureWarning");
const BasicEvaluatedExpression = require("../javascript/BasicEvaluatedExpression");
const { approve } = require("../javascript/JavascriptParserHelpers");
const { getInnerGraphUtils } = require("../optimize/InnerGraph");
const ResourceHintPlugin = require("../prefetch/ResourceHintPlugin");

/** @typedef {import("estree").MemberExpression} MemberExpression */
/** @typedef {import("estree").NewExpression} NewExpressionNode */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */

const PLUGIN_NAME = "URLParserPlugin";

/**
 * Returns file url.
 * @param {NormalModule} module module
 * @returns {URL} file url
 */
const getUrl = (module) => pathToFileURL(module.resource);

/**
 * Checks whether this object is meta url.
 * @param {JavascriptParser} parser parser parser
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
 * Whether the request points to a directory and thus can't be an asset.
 * @param {string} request request
 * @returns {boolean} true when the request is a directory reference
 */
const isDirectoryRequest = (request) =>
	request === "." || request === ".." || request.endsWith("/");

/**
 * Replaces `import.meta.url` with the runtime base URI, leaving the
 * `new URL(...)` construction untouched so it's evaluated at runtime.
 * @param {JavascriptParser} parser parser
 * @param {NewExpressionNode} expr expression
 * @returns {void}
 */
const keepNewURL = (parser, expr) => {
	const [, arg2] = expr.arguments;
	const dep = new ConstDependency(
		RuntimeGlobals.baseURI,
		/** @type {Range} */ (arg2.range),
		[RuntimeGlobals.baseURI]
	);
	dep.loc = parser.getLocation(expr);
	parser.state.module.addPresentationalDependency(dep);
};

/** @type {WeakMap<NewExpressionNode, BasicEvaluatedExpression | undefined>} */
const getEvaluatedExprCache = new WeakMap();

/**
 * Gets evaluated expr.
 * @param {NewExpressionNode} expr expression
 * @param {JavascriptParser} parser parser parser
 * @param {boolean} importMetaUrlEnabled true when import.meta.url should be handled
 * @returns {BasicEvaluatedExpression | undefined} basic evaluated expression
 */
const getEvaluatedExpr = (expr, parser, importMetaUrlEnabled) => {
	let result = getEvaluatedExprCache.get(expr);
	if (result !== undefined) return result;

	/**
	 * Returns basic evaluated expression.
	 * @returns {BasicEvaluatedExpression | undefined} basic evaluated expression
	 */
	const evaluate = () => {
		if (expr.arguments.length !== 2) return;

		const [arg1, arg2] = expr.arguments;

		if (arg2.type !== "MemberExpression" || arg1.type === "SpreadElement") {
			return;
		}
		if (!importMetaUrlEnabled || !isMetaUrl(parser, arg2)) {
			return;
		}

		return parser.evaluateExpression(arg1);
	};

	result = evaluate();
	getEvaluatedExprCache.set(expr, result);

	return result;
};

/**
 * @typedef {object} ResolvedResourceHints
 * @property {boolean=} prefetch project-wide prefetch default
 * @property {boolean=} preload project-wide preload default
 * @property {("low" | "high" | "auto" | false)=} fetchPriority project-wide fetchPriority default
 */

class URLParserPlugin {
	/**
	 * Creates an instance of URLParserPlugin.
	 * @param {JavascriptParserOptions} options options
	 */
	constructor(options) {
		/** @type {JavascriptParserOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		const relative = this.options.url === "relative";
		const importMetaUrlEnabled = isImportMetaFieldEnabled(
			this.options.importMeta,
			"url"
		);

		parser.hooks.canRename.for("URL").tap(PLUGIN_NAME, approve);
		parser.hooks.evaluateNewExpression.for("URL").tap(PLUGIN_NAME, (expr) => {
			const evaluatedExpr = getEvaluatedExpr(
				expr,
				parser,
				importMetaUrlEnabled
			);
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
							parser.getLocation(comment)
						)
					);
				}
			}

			if (importOptions && importOptions.webpackIgnore !== undefined) {
				if (typeof importOptions.webpackIgnore !== "boolean") {
					parser.state.module.addWarning(
						new UnsupportedFeatureWarning(
							`\`webpackIgnore\` expected a boolean, but received: ${importOptions.webpackIgnore}.`,
							parser.getLocation(expr)
						)
					);
					return;
				} else if (importOptions.webpackIgnore) {
					if (expr.arguments.length !== 2) return;

					const [, arg2] = expr.arguments;

					if (
						arg2.type !== "MemberExpression" ||
						!importMetaUrlEnabled ||
						!isMetaUrl(parser, arg2)
					) {
						return;
					}

					keepNewURL(parser, expr);

					return true;
				}
			}

			const evaluatedExpr = getEvaluatedExpr(
				expr,
				parser,
				importMetaUrlEnabled
			);
			if (!evaluatedExpr) return;

			/** @type {string | undefined} */
			let request;

			// static URL
			if ((request = evaluatedExpr.asString())) {
				// A directory is not an asset; keep `new URL(...)` as-is, matching Node/browsers.
				if (isDirectoryRequest(request)) {
					keepNewURL(parser, expr);
					return true;
				}

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
				dep.loc = parser.getLocation(expr);
				// `parser.javascript.urlHints` provides project-wide defaults
				// (resolved per-request, with `test` / `include` / `exclude`
				// matching); a per-URL magic comment for the same hint wins
				// when both are set.
				ResourceHintPlugin.applyResourceHints(
					dep,
					this.options.urlHints,
					request,
					importOptions,
					parser.state.module,
					parser.getLocation(expr)
				);
				parser.state.current.addDependency(dep);
				// For ESM module output the template embeds the asset's resolved
				// filename, so the asset must be code-generated first. Only added in
				// that mode — a code-gen dependency on an asset that a later watch
				// rebuild leaves unaffected can otherwise deadlock the scheduler.
				if (parser.state.compilation.options.output.module) {
					parser.state.module.addCodeGenerationDependency(dep);
				}
				getInnerGraphUtils(parser.state.compilation).onUsage(
					parser.state,
					(e) => (dep.usedByExports = e)
				);
				return true;
			}

			if (this.options.dynamicUrl === false) return;

			// context URL
			/** @type {undefined | RegExp} */
			let include;
			/** @type {undefined | RegExp} */
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
								parser.getLocation(expr)
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
								parser.getLocation(expr)
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
			dep.loc = parser.getLocation(expr);
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

			const evaluatedExpr = getEvaluatedExpr(
				expr,
				parser,
				importMetaUrlEnabled
			);
			const request = evaluatedExpr && evaluatedExpr.asString();

			if (request) return true;
		});
	}
}

module.exports = URLParserPlugin;
