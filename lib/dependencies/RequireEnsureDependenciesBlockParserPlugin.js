/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AbstractPlugin = require("../AbstractPlugin");
var RequireEnsureDependenciesBlock = require("./RequireEnsureDependenciesBlock");
var RequireEnsureItemDependency = require("./RequireEnsureItemDependency");

module.exports = AbstractPlugin.create({
	"call require.ensure": function(expr) {
		var chunkName = null, chunkNameRange = null;
		switch(expr.arguments.length) {
		case 3:
			var chunkNameExpr = this.evaluateExpression(expr.arguments[2]);
			if(!chunkNameExpr.isString()) return;
			chunkNameRange = chunkNameExpr.range;
			chunkName = chunkNameExpr.string;
			// fall through
		case 2:
			var dependencies = null;
			var dependenciesExpr = this.evaluateExpression(expr.arguments[0]);
			if(!dependenciesExpr.isArray()) return;
			var fnExpression = expr.arguments[1];

			// extract the function expression from
			// expresions like "<FunctionExpression>.bind(<Expression>)"
			if(fnExpression.type === "CallExpression" &&
				fnExpression.callee.type === "MemberExpression" &&
				fnExpression.callee.object.type === "FunctionExpression" &&
				fnExpression.callee.property.type === "Identifier" &&
				fnExpression.callee.property.name === "bind" &&
				fnExpression.arguments.length === 1) {
				this.walkExpression(fnExpression.arguments[0]);
				fnExpression = fnExpression.callee.object;
			}
			var dep = new RequireEnsureDependenciesBlock(expr, fnExpression, chunkName, chunkNameRange, this.state.module, expr.loc);
			var old = this.state.current;
			this.state.current = dep;
			try {
				var failed = false;
				this.inScope([], function() {
					dependenciesExpr.items.forEach(function(ee) {
						if(ee.isString()) {
							var edep = new RequireEnsureItemDependency(ee.string, ee.range);
							edep.loc = dep.loc;
							dep.addDependency(edep);
						} else {
							failed = true;
						}
					});
				});
				if(failed) {
					return;
				}
				if(fnExpression.type === "FunctionExpression") {
					if(fnExpression.body.type === "BlockStatement")
						this.walkStatement(fnExpression.body);
					else
						this.walkExpression(fnExpression.body);
				}
				old.addBlock(dep);
			} finally {
				this.state.current = old;
			}
			if(fnExpression.type !== "FunctionExpression") {
				this.walkExpression(fnExpression);
			}
			return true;
		}
	}
});

