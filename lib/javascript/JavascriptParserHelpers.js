/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
const ConstDependency = require("../dependencies/ConstDependency");
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");

exports.toConstantDependency = (parser, value, runtimeRequirements) => {
	return function constDependency(expr) {
		const dep = new ConstDependency(value, expr.range, runtimeRequirements);
		dep.loc = expr.loc;
		parser.state.module.addPresentationalDependency(dep);
		return true;
	};
};

exports.evaluateToString = value => {
	return function stringExpression(expr) {
		return new BasicEvaluatedExpression().setString(value).setRange(expr.range);
	};
};

exports.evaluateToBoolean = value => {
	return function booleanExpression(expr) {
		return new BasicEvaluatedExpression()
			.setBoolean(value)
			.setRange(expr.range);
	};
};

exports.evaluateToIdentifier = (identifier, rootInfo, getMembers, truthy) => {
	return function identifierExpression(expr) {
		let evaluatedExpression = new BasicEvaluatedExpression()
			.setIdentifier(identifier, rootInfo, getMembers)
			.setRange(expr.range);
		if (truthy === true) {
			evaluatedExpression = evaluatedExpression.setTruthy();
		} else if (truthy === false) {
			evaluatedExpression = evaluatedExpression.setFalsy();
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
