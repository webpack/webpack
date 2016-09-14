/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConstDependency = require("./dependencies/ConstDependency");
var BasicEvaluatedExpression = require("./BasicEvaluatedExpression");

var NullFactory = require("./NullFactory");

function getQuery(request) {
	var i = request.indexOf("?");
	return i < 0 ? "" : request.substr(i);
}

function ConstPlugin() {}
module.exports = ConstPlugin;

ConstPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		compilation.dependencyFactories.set(ConstDependency, new NullFactory());
		compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

		params.normalModuleFactory.plugin("parser", function(parser) {
			parser.plugin("statement if", function(statement) {
				var param = this.evaluateExpression(statement.test);
				var bool = param.asBool();
				if(typeof bool === "boolean") {
					if(statement.test.type !== "Literal") {
						var dep = new ConstDependency(bool + "", param.range);
						dep.loc = statement.loc;
						this.state.current.addDependency(dep);
					}
					return bool;
				}
			});
			parser.plugin("expression ?:", function(expression) {
				var param = this.evaluateExpression(expression.test);
				var bool = param.asBool();
				if(typeof bool === "boolean") {
					if(expression.test.type !== "Literal") {
						var dep = new ConstDependency(" " + bool + "", param.range);
						dep.loc = expression.loc;
						this.state.current.addDependency(dep);
					}
					return bool;
				}
			});
			parser.plugin("evaluate Identifier __resourceQuery", function(expr) {
				if(!this.state.module) return;
				var res = new BasicEvaluatedExpression();
				res.setString(getQuery(this.state.module.resource));
				res.setRange(expr.range);
				return res;
			});
			parser.plugin("expression __resourceQuery", function() {
				if(!this.state.module) return;
				this.state.current.addVariable("__resourceQuery", JSON.stringify(getQuery(this.state.module.resource)));
				return true;
			});
		});
	});
};
