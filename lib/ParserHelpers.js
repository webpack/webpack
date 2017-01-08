/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const ConstDependency = require("./dependencies/ConstDependency");

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

ParserHelpers.setTypeof = function setTypeof(parser, expr, value) {
	parser.plugin("evaluate typeof " + expr, function(expr) {
		return new BasicEvaluatedExpression().setString(value).setRange(expr.range);
	});
	parser.plugin("typeof " + expr, function(expr) {
		var dep = new ConstDependency(JSON.stringify(value), expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	});
};
