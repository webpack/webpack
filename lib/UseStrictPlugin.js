/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConstDependency = require("./dependencies/ConstDependency");
var BasicEvaluatedExpression = require("./BasicEvaluatedExpression");

var NullFactory = require("./NullFactory");

function UseStrictPlugin() {}
module.exports = UseStrictPlugin;

UseStrictPlugin.prototype.apply = function(compiler) {
	compiler.parser.plugin("program", function(ast) {
		var body = ast.body[0]
		if(body &&
			body.type === "ExpressionStatement" &&
			body.expression.type === "Literal" &&
			body.expression.value === "use strict")
			this.state.module.strict = true;
	});
};
