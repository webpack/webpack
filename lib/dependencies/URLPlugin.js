/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { pathToFileURL } = require("url");
const BasicEvaluatedExpression = require("../javascript/BasicEvaluatedExpression");
const { approve } = require("../javascript/JavascriptParserHelpers");
const InnerGraph = require("../optimize/InnerGraph");
const URLDependency = require("./URLDependency");

/** @typedef {import("estree").NewExpression} NewExpressionNode */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */

class URLPlugin {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"URLPlugin",
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
				 * @param {JavascriptParser} parser parser
				 * @param {object} parserOptions options
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

						const request = parser.evaluateExpression(arg1).asString();

						return request;
					};

					parser.hooks.canRename.for("URL").tap("URLPlugin", approve);
					parser.hooks.evaluateNewExpression
						.for("URL")
						.tap("URLPlugin", expr => {
							const request = getUrlRequest(expr);
							if (!request) return;
							const url = new URL(request, getUrl(parser.state.module));

							return new BasicEvaluatedExpression()
								.setString(url.toString())
								.setRange(expr.range);
						});
					parser.hooks.new.for("URL").tap("URLPlugin", _expr => {
						const expr = /** @type {NewExpressionNode} */ (_expr);

						const request = getUrlRequest(expr);

						if (!request) return;

						const [arg1, arg2] = expr.arguments;
						const dep = new URLDependency(
							request,
							[arg1.range[0], arg2.range[1]],
							expr.range,
							relative
						);
						dep.loc = expr.loc;
						parser.state.current.addDependency(dep);
						InnerGraph.onUsage(parser.state, e => (dep.usedByExports = e));
						return true;
					});
					parser.hooks.isPure.for("NewExpression").tap("URLPlugin", _expr => {
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
					.for("javascript/auto")
					.tap("URLPlugin", parserCallback);

				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("URLPlugin", parserCallback);
			}
		);
	}
}

module.exports = URLPlugin;
