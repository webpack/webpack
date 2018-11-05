/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");

const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const UnsupportedFeatureWarning = require("./UnsupportedFeatureWarning");
const ConstDependency = require("./dependencies/ConstDependency");

exports.getModulePath = (context, pathToModule) => {
	let moduleJsPath = path.relative(context, pathToModule);
	if (!/^[A-Z]:/i.test(moduleJsPath)) {
		moduleJsPath = "./" + moduleJsPath.replace(/\\/g, "/");
	}
	return moduleJsPath;
};

exports.toConstantDependency = (parser, value, runtimeRequirements) => {
	return function constDependency(expr) {
		const dep = new ConstDependency(value, expr.range, runtimeRequirements);
		dep.loc = expr.loc;
		parser.state.current.addDependency(dep);
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

exports.evaluateToIdentifier = (identifier, truthy) => {
	return function identifierExpression(expr) {
		let evex = new BasicEvaluatedExpression()
			.setIdentifier(identifier)
			.setRange(expr.range);
		if (truthy === true) {
			evex = evex.setTruthy();
		} else if (truthy === false) {
			evex = evex.setFalsy();
		}
		return evex;
	};
};

exports.expressionIsUnsupported = (parser, message) => {
	return function unsupportedExpression(expr) {
		const dep = new ConstDependency("(void 0)", expr.range, false);
		dep.loc = expr.loc;
		parser.state.current.addDependency(dep);
		if (!parser.state.module) return;
		parser.state.module.warnings.push(
			new UnsupportedFeatureWarning(message, expr.loc)
		);
		return true;
	};
};

exports.skipTraversal = () => true;

exports.approve = () => true;
