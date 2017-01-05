/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const RequireEnsureDependenciesBlock = require("./RequireEnsureDependenciesBlock");
const RequireEnsureItemDependency = require("./RequireEnsureItemDependency");
const getFunctionExpression = require("./getFunctionExpression");

module.exports = class RequireEnsureDependenciesBlockParserPlugin {
	apply(parser) {
		parser.plugin("call require.ensure", expr => {
			let chunkName = null;
			let chunkNameRange = null;
			switch(expr.arguments.length) {
				case 3:
					{
						const chunkNameExpr = parser.evaluateExpression(expr.arguments[2]);
						if(!chunkNameExpr.isString()) return;
						chunkNameRange = chunkNameExpr.range;
						chunkName = chunkNameExpr.string;
					}
					// falls through
				case 2:
					{
						const dependenciesExpr = parser.evaluateExpression(expr.arguments[0]);
						const dependenciesItems = dependenciesExpr.isArray() ? dependenciesExpr.items : [dependenciesExpr];
						const fnExpressionArg = expr.arguments[1];
						const fnExpression = getFunctionExpression(fnExpressionArg);

						if(fnExpression) {
							parser.walkExpressions(fnExpression.expressions);
						}

						const dep = new RequireEnsureDependenciesBlock(expr, fnExpression ? fnExpression.fn : fnExpressionArg, chunkName, chunkNameRange, parser.state.module, expr.loc);
						const old = parser.state.current;
						parser.state.current = dep;
						try {
							let failed = false;
							parser.inScope([], () => {
								dependenciesItems.forEach(ee => {
									if(ee.isString()) {
										const edep = new RequireEnsureItemDependency(ee.string, ee.range);
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
								if(fnExpression.fn.body.type === "BlockStatement")
									parser.walkStatement(fnExpression.fn.body);
								else
									parser.walkExpression(fnExpression.fn.body);
							}
							old.addBlock(dep);
						} finally {
							parser.state.current = old;
						}
						if(!fnExpression) {
							parser.walkExpression(fnExpressionArg);
						}
						return true;
					}
			}
		});
	}
};
