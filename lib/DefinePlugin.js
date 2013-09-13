/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConstDependency = require("./dependencies/ConstDependency");
var BasicEvaluatedExpression = require("./BasicEvaluatedExpression");

function DefinePlugin(definitions) {
	this.definitions = definitions;
}
module.exports = DefinePlugin;
DefinePlugin.prototype.apply = function(compiler) {
	var definitions = this.definitions;
	Object.keys(definitions).forEach(function(key) {
		var value = definitions[key];
		var code = "(" + JSON.stringify(value, function(key, value) {
			if(typeof value === "function") return value.toString();
			if(value instanceof RegExp) return value.toString();
			if(value instanceof Date) return "new Date(" + value.getTime() + ")";
			return value;
		}) + ")";
		compiler.parser.plugin("evaluate Identifier " + key, function(expr) {
			var res = new BasicEvaluatedExpression();
			res.set(value);
			res.setRange(expr.range);
			return res;
		});
		compiler.parser.plugin("evaluate typeof " + key, function(expr) {
			var res = new BasicEvaluatedExpression();
			res.setString(typeof value);
			res.setRange(expr.range);
			return res;
		});
		compiler.parser.plugin("expression " + key, function(expr) {
			var dep = new ConstDependency(code, expr.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return true;
		});
		compiler.parser.plugin("typeof " + key, function(expr) {
			var dep = new ConstDependency(JSON.stringify(typeof value), expr.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return true;
		});
	});
};