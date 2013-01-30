/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AbstractPlugin = require("../AbstractPlugin");
var RequireContextDependency = require("./RequireContextDependency");

module.exports = AbstractPlugin.create({
	"call require.context": function(expr) {
		var regExp = /^\.\/.*$/;
		var recursive = true;
		switch(expr.arguments.length) {
		case 3:
			var regExpExpr = this.evaluateExpression(expr.arguments[2]);
			if(!regExpExpr.isRegExp()) return;
			regExp = regExpExpr.regExp;
			// fall through
		case 2:
			var recursiveExpr = this.evaluateExpression(expr.arguments[1]);
			if(!recursiveExpr.isBoolean()) return;
			recursive = recursiveExpr.bool;
			// fall through
		case 1:
			var requestExpr = this.evaluateExpression(expr.arguments[0]);
			if(!requestExpr.isString()) return;
			var dep = new RequireContextDependency(requestExpr.string, recursive, regExp, expr.range);
			dep.loc = expr.loc;
			dep.optional = this.scope.inTry;
			this.state.current.addDependency(dep);
			return true;
		}
	}
});

