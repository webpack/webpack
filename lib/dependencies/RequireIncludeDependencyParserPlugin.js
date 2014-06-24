/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AbstractPlugin = require("../AbstractPlugin");
var RequireIncludeDependency = require("./RequireIncludeDependency");

module.exports = AbstractPlugin.create({
	"call require.include": function(expr) {
		if(expr.arguments.length !== 1) return;
		var param = this.evaluateExpression(expr.arguments[0]);
		if(!param.isString()) return;
		var dep = new RequireIncludeDependency(param.string, expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	}
});

