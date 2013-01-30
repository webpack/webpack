/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConstDependency = require("./dependencies/ConstDependency");

var NullFactory = require("./NullFactory");

function ConstPlugin() {
}
module.exports = ConstPlugin;

ConstPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		compilation.dependencyFactories.set(ConstDependency, new NullFactory());
		compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
	});
	compiler.parser.plugin("statement if", function(statement) {
		var param = this.evaluateExpression(statement.test);
		if(param.isBoolean()) {
			this.state.current.addDependency(new ConstDependency(param.bool + "", param.range));
			return param.bool;
		}
	});
};