/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { Field, NodeType } = require("../../javascript/syntax").parser;
const memoize = require("../../util/memoize");
const RequireEnsureDependenciesBlock = require("./RequireEnsureDependenciesBlock");
const RequireEnsureDependency = require("./RequireEnsureDependency");
const RequireEnsureItemDependency = require("./RequireEnsureItemDependency");

// only `require.ensure` and AMD calls read functions by id
const getFunctionNode = memoize(() => require("../helpers/getFunctionNode"));

/** @import { GroupOptions } from "../../graph/AsyncDependenciesBlock" */
/** @import DependenciesBlock from "../../graph/DependenciesBlock" */
/** @import BasicEvaluatedExpression from "../../javascript/BasicEvaluatedExpression" */
/** @import JavascriptParser, { JavascriptNodeReader } from "../../javascript/JavascriptParser" */
/** @import { FunctionNodeResult } from "../helpers/getFunctionNode" */

const PLUGIN_NAME = "RequireEnsureDependenciesBlockParserPlugin";

/**
 * Walks a callback's body, a block or an expression, read by id.
 * @param {JavascriptParser} parser the parser
 * @param {JavascriptNodeReader} path the reader of the callback's nodes
 * @param {number} fn the callback function
 * @param {boolean} keepTerminated whether the block leaves `terminated` as it was
 * @returns {void}
 */
const walkCallbackBody = (parser, path, fn, keepTerminated) => {
	// the callback runs later, so its `await` is never top-level
	const wasTopLevel = parser.scope.topLevelScope;
	parser.scope.topLevelScope = false;
	const body = path.field(0, Field.body, fn);
	if (path.type(body) === NodeType.BlockStatement) {
		// Opt-out of Dead Control Flow detection for this block
		const oldTerminated = parser.scope.terminated;
		parser.walkStatement(parser.nodeOfPath(path, body));
		if (keepTerminated) parser.scope.terminated = oldTerminated;
	} else {
		parser.walkExpression(parser.nodeOfPath(path, body));
	}
	parser.scope.topLevelScope = wasTopLevel;
};

module.exports = class RequireEnsureDependenciesBlockParserPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		parser.hooks.call
			.for("require.ensure")
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
				const expr = parser.nodeOfPath(path, node);
				const argumentCount = path.fieldCount(Field.arguments, node);
				/**
				 * @param {number} i the index
				 * @returns {number} the argument
				 */
				const argument = (i) => path.field(i, Field.arguments, node);
				/** @type {string | GroupOptions | null} */
				let chunkName = null;
				let errorExpressionArg = 0;
				/** @type {undefined | FunctionNodeResult} */
				let errorExpression;
				switch (argumentCount) {
					case 4: {
						const chunkNameExpr = parser.evaluateExpression(
							parser.nodeOfPath(path, argument(3))
						);
						if (!chunkNameExpr.isString()) return;
						chunkName =
							/** @type {string} */
							(chunkNameExpr.string);
					}
					// falls through
					case 3: {
						errorExpressionArg = argument(2);
						errorExpression = getFunctionNode()(path, errorExpressionArg);

						if (!errorExpression && !chunkName) {
							const chunkNameExpr = parser.evaluateExpression(
								parser.nodeOfPath(path, errorExpressionArg)
							);
							if (!chunkNameExpr.isString()) return;
							chunkName =
								/** @type {string} */
								(chunkNameExpr.string);
						}
					}
					// falls through
					case 2: {
						const dependenciesExpr = parser.evaluateExpression(
							parser.nodeOfPath(path, argument(0))
						);
						const dependenciesItems =
							/** @type {BasicEvaluatedExpression[]} */ (
								dependenciesExpr.isArray()
									? dependenciesExpr.items
									: [dependenciesExpr]
							);
						// Bail out before walking anything: the parser walks the whole
						// call again when this hook returns `undefined`.
						if (!dependenciesItems.every((item) => item.isString())) return;
						const successExpressionArg = argument(1);
						const successExpression = getFunctionNode()(
							path,
							successExpressionArg
						);

						if (successExpression) {
							for (const expression of successExpression.expressions) {
								parser.walkExpression(parser.nodeOfPath(path, expression));
							}
						}
						if (errorExpression) {
							for (const expression of errorExpression.expressions) {
								parser.walkExpression(parser.nodeOfPath(path, expression));
							}
						}

						const depBlock = new RequireEnsureDependenciesBlock(
							chunkName,
							parser.getLocation(expr)
						);
						const errorCallbackExists =
							argumentCount === 4 || (!chunkName && argumentCount === 3);
						const dep = new RequireEnsureDependency(
							path.range(node),
							path.range(successExpressionArg),
							errorCallbackExists && path.range(errorExpressionArg)
						);
						dep.loc = parser.getLocation(expr);
						depBlock.addDependency(dep);
						const old = parser.state.current;
						parser.state.current = /** @type {typeof parser.state.current} */ (
							/** @type {DependenciesBlock} */ (depBlock)
						);
						try {
							parser.inFunctionScope(true, [], () => {
								for (const ee of dependenciesItems) {
									const ensureDependency = new RequireEnsureItemDependency(
										/** @type {string} */ (ee.string)
									);
									ensureDependency.loc = parser.getLocation(expr);
									depBlock.addDependency(ensureDependency);
								}
							});
							if (successExpression) {
								walkCallbackBody(parser, path, successExpression.fn, true);
							}
							old.addBlock(depBlock);
						} finally {
							parser.state.current = old;
						}
						if (!successExpression) {
							parser.walkExpression(
								parser.nodeOfPath(path, successExpressionArg)
							);
						}
						if (errorExpression) {
							walkCallbackBody(parser, path, errorExpression.fn, false);
						} else if (errorExpressionArg !== 0 && errorCallbackExists) {
							// A chunk name in this slot is dropped from the output, so
							// replacements nested in it would have no source around them.
							parser.walkExpression(
								parser.nodeOfPath(path, errorExpressionArg)
							);
						}
						return true;
					}
				}
			});
	}
};
