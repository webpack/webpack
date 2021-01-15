/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
const ConstDependency = require("../dependencies/ConstDependency");
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");

/** @typedef {import("estree").Expression} ExpressionNode */
/** @typedef {import("estree").Node} Node */
/** @typedef {import("./JavascriptParser")} JavascriptParser */

/**
 * @param {JavascriptParser} parser the parser
 * @param {string} value the const value
 * @param {string[]=} runtimeRequirements runtime requirements
 * @returns {function(ExpressionNode): true} plugin function
 */
exports.toConstantDependency = (parser, value, runtimeRequirements) => {
	return function constDependency(expr) {
		const dep = new ConstDependency(value, expr.range, runtimeRequirements);
		dep.loc = expr.loc;
		parser.state.module.addPresentationalDependency(dep);
		return true;
	};
};

/**
 * @param {string} value the string value
 * @returns {function(ExpressionNode): BasicEvaluatedExpression} plugin function
 */
exports.evaluateToString = value => {
	return function stringExpression(expr) {
		return new BasicEvaluatedExpression().setString(value).setRange(expr.range);
	};
};

/**
 * @param {number} value the number value
 * @returns {function(ExpressionNode): BasicEvaluatedExpression} plugin function
 */
exports.evaluateToNumber = value => {
	return function stringExpression(expr) {
		return new BasicEvaluatedExpression().setNumber(value).setRange(expr.range);
	};
};

/**
 * @param {boolean} value the boolean value
 * @returns {function(ExpressionNode): BasicEvaluatedExpression} plugin function
 */
exports.evaluateToBoolean = value => {
	return function booleanExpression(expr) {
		return new BasicEvaluatedExpression()
			.setBoolean(value)
			.setRange(expr.range);
	};
};

/**
 * @param {string} identifier identifier
 * @param {string} rootInfo rootInfo
 * @param {function(): string[]} getMembers getMembers
 * @param {boolean|null=} truthy is truthy, null if nullish
 * @returns {function(ExpressionNode): BasicEvaluatedExpression} callback
 */
exports.evaluateToIdentifier = (identifier, rootInfo, getMembers, truthy) => {
	return function identifierExpression(expr) {
		let evaluatedExpression = new BasicEvaluatedExpression()
			.setIdentifier(identifier, rootInfo, getMembers)
			.setSideEffects(false)
			.setRange(expr.range);
		switch (truthy) {
			case true:
				evaluatedExpression.setTruthy();
				evaluatedExpression.setNullish(false);
				break;
			case null:
				evaluatedExpression.setFalsy();
				evaluatedExpression.setNullish(true);
				break;
			case false:
				evaluatedExpression.setFalsy();
				break;
		}

		return evaluatedExpression;
	};
};

exports.expressionIsUnsupported = (parser, message) => {
	return function unsupportedExpression(expr) {
		const dep = new ConstDependency("(void 0)", expr.range, null);
		dep.loc = expr.loc;
		parser.state.module.addPresentationalDependency(dep);
		if (!parser.state.module) return;
		parser.state.module.addWarning(
			new UnsupportedFeatureWarning(message, expr.loc)
		);
		return true;
	};
};

exports.skipTraversal = () => true;

exports.approve = () => true;
