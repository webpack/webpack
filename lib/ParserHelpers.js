/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const ConstDependency = require("./dependencies/ConstDependency");
const UnsupportedFeatureWarning = require("./UnsupportedFeatureWarning");

const ParserHelpers = exports;

ParserHelpers.addParsedVariableToModule = function(parser, name, expression) {
	if(!parser.state.current.addVariable) return false;
	var deps = [];
	parser.parse(expression, {
		current: {
			addDependency: function(dep) {
				dep.userRequest = name;
				deps.push(dep);
			}
		},
		module: parser.state.module
	});
	parser.state.current.addVariable(name, expression, deps);
	return true;
};

ParserHelpers.toConstantDependency = function toConstantDependency(value) {
	return function constantDependency(expr) {
		var dep = new ConstDependency(JSON.stringify(value), expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	};
};

ParserHelpers.evaluateToString = function evaluateToString(value) {
	return function stringExpression(expr) {
		return new BasicEvaluatedExpression().setString(value).setRange(expr.range);
	};
};

ParserHelpers.expressionIsUnsupported = function expressionIsUnsupported(message) {
	return function unsupportedExpression(expr) {
		var dep = new ConstDependency("(void 0)", expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		if(!this.state.module) return;
		this.state.module.warnings.push(new UnsupportedFeatureWarning(this.state.module, message));
		return true;
	};
};
