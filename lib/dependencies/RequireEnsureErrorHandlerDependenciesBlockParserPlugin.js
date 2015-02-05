/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AbstractPlugin = require("../AbstractPlugin");
var RequireEnsureErrorHandlerDependenciesBlock = require("./RequireEnsureErrorHandlerDependenciesBlock");
var RequireEnsureItemDependency = require("./RequireEnsureItemDependency");
var getFunctionExpression = require("./getFunctionExpression");


// a) require.ensure(['dpes'], successCallback, errorCallback, name);
// b) require.ensure(['dpes'], successCallback, errorCallback);
// c) require.ensure(['dpes'], successCallback, name);
// d) require.ensure(['dpes'], successCallback);


module.exports = AbstractPlugin.create({
	"call require.ensure": function(expr) {

		if (!expr.arguments.length) {
			return;
		}

		var dependencies = expr.arguments[0],
			successCallback = expr.arguments[1],
			errorCallback = expr.arguments[2],
			chunkName = expr.arguments[3],
			errorCallbackExpr = null,
			chunkNameExpr = null,
			chunkNameRange = null;

		if (errorCallback) {
			debugger;
			errorCallbackExpr = this.evaluateExpression(errorCallback);
		}

		if (errorCallbackExpr && errorCallbackExpr.isString()) {
			chunkName = errorCallback;
			chunkNameExpr = errorCallbackExpr;
			errorCallback = errorCallbackExpr = null;
		} else {
			if (errorCallback) {
				errorCallbackExpr = getFunctionExpression(errorCallback);
			}
			if (chunkName) {
				chunkNameExpr = this.evaluateExpression(chunkName);
			}
		}

		if (chunkNameExpr && chunkNameExpr.isString()) {
			chunkNameRange = chunkNameExpr.range;
			chunkName = chunkNameExpr.string;
		}

		var dependenciesExpr = this.evaluateExpression(dependencies);
		var dependenciesItems = dependenciesExpr.isArray() ? dependenciesExpr.items : [dependenciesExpr];
		var successCallbackExpr = getFunctionExpression(successCallback);

		if (successCallbackExpr) {
			this.walkExpressions(successCallbackExpr.expressions);
		}

		if (errorCallbackExpr) {
			debugger;
			this.walkExpressions(errorCallbackExpr.expressions);
		}

		if (chunkName === 'myburberry') {
			debugger;
		}

		var old = this.state.current;

		var dep = new RequireEnsureErrorHandlerDependenciesBlock(expr, (successCallbackExpr ? successCallbackExpr.fn : successCallback), (errorCallbackExpr ? errorCallbackExpr.fn : errorCallback), chunkName, chunkNameRange, this.state.module, expr.loc);
		var old = this.state.current;
		this.state.current = dep;
		try {
			var failed = false;
			this.inScope([], function() {
				dependenciesItems.forEach(function(ee) {
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
			if(successCallbackExpr) {
				if(successCallbackExpr.fn.body.type === "BlockStatement")
					this.walkStatement(successCallbackExpr.fn.body);
				else
					this.walkExpression(successCallbackExpr.fn.body);
			}
			if(errorCallbackExpr) {
				if(errorCallbackExpr.fn.body.type === "BlockStatement")
					this.walkStatement(errorCallbackExpr.fn.body);
				else
					this.walkExpression(errorCallbackExpr.fn.body);
			}
			old.addBlock(dep);
		} finally {
			this.state.current = old;
		}
		if(!successCallbackExpr) {
			this.walkExpression(successCallback);
		}
		if(!errorCallbackExpr && errorCallback) {
			this.walkExpression(errorCallback);
		}
		return true;



		// switch(expr.arguments.length) {
		// case 3:
		// 	var chunkNameExpr = this.evaluateExpression(expr.arguments[2]);
		// 	if(!chunkNameExpr.isString()) return;
		// 	chunkNameRange = chunkNameExpr.range;
		// 	chunkName = chunkNameExpr.string;
		// 	// fall through
		// case 2:
		// 	var dependencies = null;

		// }
	}
});

