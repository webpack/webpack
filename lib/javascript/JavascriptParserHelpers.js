/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ConstDependency = require("../dependencies/core/ConstDependency");
const memoize = require("../util/memoize");

const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const { Field, NodeType, Part } = require("./syntax").parser;

const getUnsupportedFeatureWarning = memoize(() =>
	require("../errors/UnsupportedFeatureWarning")
);

/** @import { CallExpression, Expression, NewExpression } from "estree" */
/** @import JavascriptParser, { JavascriptNodeReader, Range } from "./JavascriptParser.js" */
/** @import { DependencyLocation } from "../graph/Dependency.js" */
/** @import { GetMembers } from "./BasicEvaluatedExpression.js" */

/**
 * A helper's tap: an object tap gets the ESTree node, a `{ path: true }` tap
 * the path and the node's id.
 * @template R
 * @typedef {(expressionOrPath: Expression | JavascriptNodeReader, node?: number) => R} HelperTap
 */

/**
 * Returns the range of the node a helper's tap got.
 * @param {Expression | JavascriptNodeReader} expressionOrPath the ESTree node, or the path a `{ path: true }` tap got
 * @param {number=} node the node's id, for a `{ path: true }` tap
 * @returns {Range} the node's range
 */
const rangeOf = (expressionOrPath, node) =>
	typeof node === "number"
		? /** @type {JavascriptNodeReader} */ (expressionOrPath).range(node)
		: /** @type {Range} */ (/** @type {Expression} */ (expressionOrPath).range);

/**
 * Returns the location of the node a helper's tap got.
 * @param {JavascriptParser} parser the parser
 * @param {Expression | JavascriptNodeReader} expressionOrPath the ESTree node, or the path a `{ path: true }` tap got
 * @param {number=} node the node's id, for a `{ path: true }` tap
 * @returns {DependencyLocation} the node's location
 */
const locationOf = (parser, expressionOrPath, node) =>
	parser.getLocation(
		typeof node === "number"
			? node
			: /** @type {Expression} */ (expressionOrPath)
	);

module.exports.approve = () => true;

/**
 * Returns plugin function.
 * @param {boolean} value the boolean value
 * @returns {HelperTap<BasicEvaluatedExpression>} plugin function
 */
module.exports.evaluateToBoolean = (value) =>
	function booleanExpression(expressionOrPath, node) {
		return new BasicEvaluatedExpression()
			.setBoolean(value)
			.setRange(rangeOf(expressionOrPath, node));
	};

/**
 * Returns callback.
 * @param {string} identifier identifier
 * @param {string} rootInfo rootInfo
 * @param {GetMembers} getMembers getMembers
 * @param {boolean | null=} truthy is truthy, null if nullish
 * @returns {HelperTap<BasicEvaluatedExpression>} callback
 */
module.exports.evaluateToIdentifier = (
	identifier,
	rootInfo,
	getMembers,
	truthy
) =>
	function identifierExpression(expressionOrPath, node) {
		const evaluatedExpression = new BasicEvaluatedExpression()
			.setIdentifier(identifier, rootInfo, getMembers)
			.setSideEffects(false)
			.setRange(rangeOf(expressionOrPath, node));
		switch (truthy) {
			case true:
				evaluatedExpression.setTruthy();
				break;
			case null:
				evaluatedExpression.setNullish(true);
				break;
			case false:
				evaluatedExpression.setFalsy();
				break;
		}

		return evaluatedExpression;
	};

/**
 * Returns plugin function.
 * @param {number} value the number value
 * @returns {HelperTap<BasicEvaluatedExpression>} plugin function
 */
module.exports.evaluateToNumber = (value) =>
	function numberExpression(expressionOrPath, node) {
		return new BasicEvaluatedExpression()
			.setNumber(value)
			.setRange(rangeOf(expressionOrPath, node));
	};

/**
 * Returns plugin function.
 * @param {string} value the string value
 * @returns {HelperTap<BasicEvaluatedExpression>} plugin function
 */
module.exports.evaluateToString = (value) =>
	function stringExpression(expressionOrPath, node) {
		return new BasicEvaluatedExpression()
			.setString(value)
			.setRange(rangeOf(expressionOrPath, node));
	};

/**
 * Returns callback to handle unsupported expression.
 * @param {JavascriptParser} parser the parser
 * @param {string} message the message
 * @returns {HelperTap<boolean | undefined>} callback to handle unsupported expression
 */
module.exports.expressionIsUnsupported = (parser, message) =>
	function unsupportedExpression(expressionOrPath, node) {
		const loc = locationOf(parser, expressionOrPath, node);
		const dep = new ConstDependency(
			"(void 0)",
			rangeOf(expressionOrPath, node),
			null
		);
		dep.loc = loc;
		parser.state.module.addPresentationalDependency(dep);
		if (!parser.state.module) return;
		parser.state.module.addWarning(
			new (getUnsupportedFeatureWarning())(message, loc)
		);
		return true;
	};

/**
 * Returns the range inside the parentheses of a call's argument list. Unlike
 * a range joined from the first and last argument, it keeps the replaced text
 * balanced when an argument is wrapped in parentheses.
 * @param {JavascriptParser} parser the parser
 * @param {CallExpression | NewExpression | JavascriptNodeReader} expressionOrPath a call with at least one argument, or the path a `{ path: true }` tap got
 * @param {number=} node the call's id, for a `{ path: true }` tap
 * @returns {Range} the range from after `(` to before the closing `)`
 */
module.exports.getArgumentsRange = (parser, expressionOrPath, node) => {
	const source = /** @type {string} */ (parser.state.source);
	/** @type {number} */
	let calleeEnd;
	/** @type {number} */
	let argumentsStart;
	if (typeof node === "number") {
		const path = /** @type {JavascriptNodeReader} */ (expressionOrPath);
		calleeEnd = path.end(path.field(0, Field.callee, node));
		argumentsStart = path.start(path.field(0, Field.arguments, node));
	} else {
		const expr = /** @type {CallExpression | NewExpression} */ (
			expressionOrPath
		);
		calleeEnd = /** @type {Range} */ (expr.callee.range)[1];
		argumentsStart = /** @type {Range} */ (expr.arguments[0].range)[0];
	}
	const comments = parser.getComments([calleeEnd, argumentsStart]);
	let commentIndex = 0;
	let pos = calleeEnd;
	// Only `)` closing a parenthesized callee, whitespace and comments
	// precede the `(` that opens the argument list.
	while (source.charCodeAt(pos) !== 40) {
		const comment = comments[commentIndex];
		const commentRange = comment && /** @type {Range} */ (comment.range);
		if (commentRange !== undefined && commentRange[0] === pos) {
			pos = commentRange[1];
			commentIndex++;
		} else {
			pos++;
		}
	}
	return [pos + 1, rangeOf(expressionOrPath, node)[1] - 1];
};

/**
 * @param {JavascriptNodeReader} path the reader of the program's nodes
 * @param {number} program the program's node
 * @returns {boolean} whether the module scope holds a `using`/`await using` declaration
 */
module.exports.hasTopLevelUsingDeclaration = (path, program) => {
	const count = path.fieldCount(Field.body, program);
	for (let i = 0; i < count; i++) {
		const statement = path.field(i, Field.body, program);
		if (path.type(statement) !== NodeType.VariableDeclaration) continue;
		const kind = path.textOf(Part.kind, statement);
		if (kind === "using" || kind === "await using") return true;
	}
	return false;
};

module.exports.skipTraversal = () => true;

/**
 * Returns plugin function.
 * @param {JavascriptParser} parser the parser
 * @param {string} value the const value
 * @param {(string[] | null)=} runtimeRequirements runtime requirements
 * @returns {HelperTap<true>} plugin function
 */
module.exports.toConstantDependency = (parser, value, runtimeRequirements) =>
	function constDependency(expressionOrPath, node) {
		const dep = new ConstDependency(
			value,
			rangeOf(expressionOrPath, node),
			runtimeRequirements
		);
		dep.loc = locationOf(parser, expressionOrPath, node);
		parser.state.module.addPresentationalDependency(dep);
		return true;
	};
