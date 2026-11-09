/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ConstDependency = require("../dependencies/core/ConstDependency");
const memoize = require("../util/memoize");

const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const { Field, NodeType, Part } = require("./syntax-parser");

const getUnsupportedFeatureWarning = memoize(() =>
	require("../errors/UnsupportedFeatureWarning")
);

/** @import { CallExpression, Expression, NewExpression } from "estree" */
/** @import JavascriptParser, { JavascriptNodeReader, Range } from "./JavascriptParser" */
/** @import { GetMembers } from "./BasicEvaluatedExpression" */

module.exports.approve = () => true;

/**
 * Returns plugin function.
 * @param {boolean} value the boolean value
 * @returns {(expression: Expression) => BasicEvaluatedExpression} plugin function
 */
module.exports.evaluateToBoolean = (value) =>
	function booleanExpression(expr) {
		return new BasicEvaluatedExpression()
			.setBoolean(value)
			.setRange(/** @type {Range} */ (expr.range));
	};

/**
 * Returns callback.
 * @param {string} identifier identifier
 * @param {string} rootInfo rootInfo
 * @param {GetMembers} getMembers getMembers
 * @param {boolean | null=} truthy is truthy, null if nullish
 * @returns {(expression: Expression) => BasicEvaluatedExpression} callback
 */
module.exports.evaluateToIdentifier = (
	identifier,
	rootInfo,
	getMembers,
	truthy
) =>
	function identifierExpression(expr) {
		const evaluatedExpression = new BasicEvaluatedExpression()
			.setIdentifier(identifier, rootInfo, getMembers)
			.setSideEffects(false)
			.setRange(/** @type {Range} */ (expr.range));
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
 * @returns {(expression: Expression) => BasicEvaluatedExpression} plugin function
 */
module.exports.evaluateToNumber = (value) =>
	function stringExpression(expr) {
		return new BasicEvaluatedExpression()
			.setNumber(value)
			.setRange(/** @type {Range} */ (expr.range));
	};

/**
 * Returns plugin function.
 * @param {string} value the string value
 * @returns {(expression: Expression) => BasicEvaluatedExpression} plugin function
 */
module.exports.evaluateToString = (value) =>
	function stringExpression(expr) {
		return new BasicEvaluatedExpression()
			.setString(value)
			.setRange(/** @type {Range} */ (expr.range));
	};

/**
 * Returns callback to handle unsupported expression.
 * @param {JavascriptParser} parser the parser
 * @param {string} message the message
 * @returns {(expression: Expression) => boolean | undefined} callback to handle unsupported expression
 */
module.exports.expressionIsUnsupported = (parser, message) =>
	function unsupportedExpression(expr) {
		const dep = new ConstDependency(
			"(void 0)",
			/** @type {Range} */ (expr.range),
			null
		);
		dep.loc = parser.getLocation(expr);
		parser.state.module.addPresentationalDependency(dep);
		if (!parser.state.module) return;
		parser.state.module.addWarning(
			new (getUnsupportedFeatureWarning())(message, parser.getLocation(expr))
		);
		return true;
	};

/**
 * @param {JavascriptNodeReader} path the reader of the program's nodes
 * @param {EXPECTED_ANY} program the program node
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
 * Returns the range inside the parentheses of a call's argument list. Unlike
 * a range joined from the first and last argument, it keeps the replaced text
 * balanced when an argument is wrapped in parentheses.
 * @param {JavascriptParser} parser the parser
 * @param {CallExpression | NewExpression} expr a call with at least one argument
 * @returns {Range} the range from after `(` to before the closing `)`
 */
module.exports.getArgumentsRange = (parser, expr) => {
	const source = /** @type {string} */ (parser.state.source);
	const calleeEnd = /** @type {Range} */ (expr.callee.range)[1];
	const comments = parser.getComments([
		calleeEnd,
		/** @type {Range} */ (expr.arguments[0].range)[0]
	]);
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
	return [pos + 1, /** @type {Range} */ (expr.range)[1] - 1];
};

/**
 * Returns plugin function.
 * @param {JavascriptParser} parser the parser
 * @param {string} value the const value
 * @param {(string[] | null)=} runtimeRequirements runtime requirements
 * @returns {(expression: Expression) => true} plugin function
 */
module.exports.toConstantDependency = (parser, value, runtimeRequirements) =>
	function constDependency(expr) {
		const dep = new ConstDependency(
			value,
			/** @type {Range} */
			(expr.range),
			runtimeRequirements
		);
		dep.loc = parser.getLocation(expr);
		parser.state.module.addPresentationalDependency(dep);
		return true;
	};
