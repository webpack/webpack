/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

// a) require.ensure(['deps'], successCallback, errorCallback, name);
// b) require.ensure(['deps'], successCallback, errorCallback);
// c) require.ensure(['deps'], successCallback, name);
// d) require.ensure(['deps'], successCallback);

var AbstractPlugin = require("../AbstractPlugin");
var RequireEnsureErrorHandlerDependenciesBlock = require("./RequireEnsureErrorHandlerDependenciesBlock");
var RequireEnsureItemDependency = require("./RequireEnsureItemDependency");
var getFunctionExpression = require("./getFunctionExpression");

module.exports = AbstractPlugin.create({
	"call require.ensure": function(expr) {

		var dependencies = expr.arguments[0],
			successCallback = expr.arguments[1],
			errorCallback = expr.arguments[2],
			chunkName = expr.arguments[3],
			dependenciesExpr = null,
			successCallbackExpr = null,
			errorCallbackExpr = null,
			chunkNameExpr = null;

		if (errorCallback) {
			errorCallbackExpr = getFunctionExpression(errorCallback);
			// if `errorCallback` isn't a function then shuffle arguments.
			if (!errorCallbackExpr) {
				chunkName = errorCallback;
				errorCallback = errorCallbackExpr = null;
			}
		}

		if (chunkName) {
			chunkNameExpr = this.evaluateExpression(chunkName);
			if (chunkNameExpr.isString()) {
				var chunkNameRange = chunkNameExpr.range;
				chunkName = chunkNameExpr.string;
			}
		}

		dependenciesExpr = this.evaluateExpression(dependencies);
		var dependenciesItems = dependenciesExpr.isArray() ? dependenciesExpr.items : [dependenciesExpr];
		successCallbackExpr = getFunctionExpression(successCallback);

		if (successCallbackExpr) {
			this.walkExpressions(successCallbackExpr.expressions);
		}

		if (errorCallbackExpr) {
			this.walkExpressions(errorCallbackExpr.expressions);
		}

		var dep = new RequireEnsureErrorHandlerDependenciesBlock(expr, chunkName, this.state.module, expr.loc);
		var old = this.state.current;
		this.state.current = dep;
		try {
			var failed = false;
			this.inScope([], function() {
				dependenciesItems.forEach(function(ee) {
					if(ee.isString()) {
						// TODO: work out what RequireEnsureItemDependency is for
						// and if it needs to be extended for the errorhandling plugin.
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
	}
});

