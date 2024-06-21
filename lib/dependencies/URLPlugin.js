/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { pathToFileURL } = require("url");
const CommentCompilationWarning = require("../CommentCompilationWarning");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
const BasicEvaluatedExpression = require("../javascript/BasicEvaluatedExpression");
const { approve } = require("../javascript/JavascriptParserHelpers");
const InnerGraph = require("../optimize/InnerGraph");
const URLDependency = require("./URLDependency");

/** @typedef {import("estree").NewExpression} NewExpressionNode */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser")} Parser */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("./URLDependency").PreloadOptions} PreloadOptions */

const PLUGIN_NAME = "URLPlugin";

class URLPlugin {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(URLDependency, normalModuleFactory);
				compilation.dependencyTemplates.set(
					URLDependency,
					new URLDependency.Template()
				);

				/**
				 * @param {NormalModule} module module
				 * @returns {URL} file url
				 */
				const getUrl = module => {
					return pathToFileURL(module.resource);
				};

				/**
				 * @param {Parser} parser parser parser
				 * @param {JavascriptParserOptions} parserOptions parserOptions
				 * @returns {void}
				 */
				const parserCallback = (parser, parserOptions) => {
					if (parserOptions.url === false) return;
					const relative = parserOptions.url === "relative";

					/**
					 * @param {NewExpressionNode} expr expression
					 * @returns {undefined | string} request
					 */
					const getUrlRequest = expr => {
						if (expr.arguments.length !== 2) return;

						const [arg1, arg2] = expr.arguments;

						if (
							arg2.type !== "MemberExpression" ||
							arg1.type === "SpreadElement"
						)
							return;

						const chain = parser.extractMemberExpressionChain(arg2);

						if (
							chain.members.length !== 1 ||
							chain.object.type !== "MetaProperty" ||
							chain.object.meta.name !== "import" ||
							chain.object.property.name !== "meta" ||
							chain.members[0] !== "url"
						)
							return;

						return parser.evaluateExpression(arg1).asString();
					};

					parser.hooks.canRename.for("URL").tap(PLUGIN_NAME, approve);
					parser.hooks.evaluateNewExpression
						.for("URL")
						.tap(PLUGIN_NAME, expr => {
							const request = getUrlRequest(expr);
							if (!request) return;
							const url = new URL(request, getUrl(parser.state.module));

							return new BasicEvaluatedExpression()
								.setString(url.toString())
								.setRange(/** @type {Range} */ (expr.range));
						});
					parser.hooks.new.for("URL").tap(PLUGIN_NAME, _expr => {
						const expr = /** @type {NewExpressionNode} */ (_expr);

						const request = getUrlRequest(expr);

						if (!request) return;

						/** @type {PreloadOptions} */
						const preloadOptions = {};

						if (
							parserOptions.urlPreloadRegExp &&
							parserOptions.urlPreloadRegExp.test(request)
						) {
							const { urlPreload, urlPreloadAs, urlPreloadFetchPriority } =
								parserOptions;

							if (urlPreload !== undefined && urlPreload !== false)
								preloadOptions.preloadOrder =
									urlPreload === true ? 0 : urlPreload;
							if (urlPreloadAs !== undefined && urlPreloadAs !== false)
								preloadOptions.preloadAs = urlPreloadAs;
							if (
								urlPreloadFetchPriority !== undefined &&
								urlPreloadFetchPriority !== false
							)
								preloadOptions.fetchPriority = urlPreloadFetchPriority;

							const { options: importOptions, errors: commentErrors } =
								parser.parseCommentOptions(/** @type {Range} */ (expr.range));

							if (commentErrors) {
								for (const e of commentErrors) {
									const { comment } = e;
									parser.state.module.addWarning(
										new CommentCompilationWarning(
											`Compilation error while processing magic comment(-s): /*${comment.value}*/: ${e.message}`,
											comment.loc
										)
									);
								}
							}

							if (importOptions) {
								if (importOptions.webpackPreload !== undefined) {
									if (importOptions.webpackPreload === true) {
										preloadOptions.preloadOrder = 0;
									} else if (typeof importOptions.webpackPreload === "number") {
										preloadOptions.preloadOrder = importOptions.webpackPreload;
									} else {
										parser.state.module.addWarning(
											new UnsupportedFeatureWarning(
												`\`webpackPreload\` expected true or a number, but received: ${importOptions.webpackPreload}.`,
												/** @type {DependencyLocation} */ (expr.loc)
											)
										);
									}
								}
								if (importOptions.webpackPreloadAs !== undefined) {
									if (typeof importOptions.webpackPreloadAs === "string") {
										preloadOptions.preloadAs = importOptions.webpackPreloadAs;
									} else {
										parser.state.module.addWarning(
											new UnsupportedFeatureWarning(
												`\`webpackPreloadAs\` expected string, but received: ${importOptions.webpackPreloadAs}.`,
												/** @type {DependencyLocation} */ (expr.loc)
											)
										);
									}
								}
								if (importOptions.webpackPreloadFetchPriority !== undefined) {
									if (
										typeof importOptions.webpackPreloadFetchPriority ===
											"string" &&
										["high", "low", "auto"].includes(
											importOptions.webpackPreloadFetchPriority
										)
									) {
										preloadOptions.fetchPriority =
											importOptions.webpackPreloadFetchPriority;
									} else {
										parser.state.module.addWarning(
											new UnsupportedFeatureWarning(
												`\`webpackFetchPriority\` expected true or "low", "high" or "auto", but received: ${importOptions.webpackPreloadFetchPriority}.`,
												/** @type {DependencyLocation} */ (expr.loc)
											)
										);
									}
								}
							}

							if (
								preloadOptions.preloadOrder !== undefined &&
								preloadOptions.preloadAs === undefined
							) {
								parser.state.module.addWarning(
									new UnsupportedFeatureWarning(
										`\`webpackPreload\` for \`new URL(...)\` expected \`webpackPreloadAs\` comment.`,
										/** @type {DependencyLocation} */ (expr.loc)
									)
								);
							}
						}

						// TODO - `type` and `media` support

						const [arg1, arg2] = expr.arguments;
						const dep = new URLDependency(
							request,
							[
								/** @type {Range} */ (arg1.range)[0],
								/** @type {Range} */ (arg2.range)[1]
							],
							/** @type {Range} */ (expr.range),
							relative,
							preloadOptions
						);
						dep.loc = /** @type {DependencyLocation} */ (expr.loc);
						parser.state.current.addDependency(dep);
						InnerGraph.onUsage(parser.state, e => (dep.usedByExports = e));
						return true;
					});
					parser.hooks.isPure.for("NewExpression").tap(PLUGIN_NAME, _expr => {
						const expr = /** @type {NewExpressionNode} */ (_expr);
						const { callee } = expr;
						if (callee.type !== "Identifier") return;
						const calleeInfo = parser.getFreeInfoFromVariable(callee.name);
						if (!calleeInfo || calleeInfo.name !== "URL") return;

						const request = getUrlRequest(expr);

						if (request) return true;
					});
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, parserCallback);

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, parserCallback);
			}
		);
	}
}

module.exports = URLPlugin;
