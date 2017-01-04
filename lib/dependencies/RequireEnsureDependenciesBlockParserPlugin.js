"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
/* eslint-disable no-case-declarations */
const RequireEnsureDependenciesBlock = require("./RequireEnsureDependenciesBlock");
const RequireEnsureItemDependency = require("./RequireEnsureItemDependency");
const getFunctionExpression = require("./getFunctionExpression");
class RequireEnsureDependenciesBlockParserPlugin {
	apply(parser) {
		parser.plugin("call require.ensure", function(expr) {
			let chunkName = null;
			let chunkNameRange = null;
			switch(expr.arguments.length) {
				case 3:
					const chunkNameExpr = this.evaluateExpression(expr.arguments[2]);
					if(!chunkNameExpr.isString()) {
						return;
					}
					chunkNameRange = chunkNameExpr.range;
					chunkName = chunkNameExpr.string;
				// falls through
				case 2:
					const dependenciesExpr = this.evaluateExpression(expr.arguments[0]);
					const dependenciesItems = dependenciesExpr.isArray() ? dependenciesExpr.items : [dependenciesExpr];
					const fnExpressionArg = expr.arguments[1];
					const fnExpression = getFunctionExpression(fnExpressionArg);
					if(fnExpression) {
						this.walkExpressions(fnExpression.expressions);
					}
					const dep = new RequireEnsureDependenciesBlock(expr, fnExpression ? fnExpression.fn : fnExpressionArg, chunkName, chunkNameRange, this.state.module, expr.loc);
					const old = this.state.current;
					this.state.current = dep;
					try {
						let failed = false;
						this.inScope([], () => {
							dependenciesItems.forEach(ee => {
								if(ee.isString()) {
									const edep = new RequireEnsureItemDependency(ee.string);
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
						if(fnExpression) {
							if(fnExpression.fn.body.type === "BlockStatement") {
								this.walkStatement(fnExpression.fn.body);
							} else {
								this.walkExpression(fnExpression.fn.body);
							}
						}
						old.addBlock(dep);
					}					finally {
						this.state.current = old;
					}
					if(!fnExpression) {
						this.walkExpression(fnExpressionArg);
					}
					return true;
			}
		});
	}
}
module.exports = RequireEnsureDependenciesBlockParserPlugin;
