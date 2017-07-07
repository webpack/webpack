/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const RequireContextDependency = require("./RequireContextDependency");

module.exports = class RequireContextDependencyParserPlugin {
	apply(parser) {
		parser.plugin("call require.context", expr => {
			let regExp = /^\.\/.*$/;
			let recursive = true;
			let weak = false;
			let chunkName;
			switch(expr.arguments.length) {
				case 5:
					{
						const chunkNameExpr = parser.evaluateExpression(expr.arguments[4]);
						if(!chunkNameExpr.isString()) return;
						chunkName = chunkNameExpr.string;
					}
					// falls through
				case 4:
					{
						const weakExpr = parser.evaluateExpression(expr.arguments[3]);
						if(!weakExpr.isBoolean()) return;
						weak = weakExpr.bool;
					}
					// falls through
				case 3:
					{
						const regExpExpr = parser.evaluateExpression(expr.arguments[2]);
						if(!regExpExpr.isRegExp()) return;
						regExp = regExpExpr.regExp;
					}
					// falls through
				case 2:
					{
						const recursiveExpr = parser.evaluateExpression(expr.arguments[1]);
						if(!recursiveExpr.isBoolean()) return;
						recursive = recursiveExpr.bool;
					}
					// falls through
				case 1:
					{
						const requestExpr = parser.evaluateExpression(expr.arguments[0]);
						if(!requestExpr.isString()) return;
						const dep = new RequireContextDependency(requestExpr.string, recursive, regExp, weak, chunkName, expr.range);
						dep.loc = expr.loc;
						dep.optional = parser.scope.inTry;
						parser.state.current.addDependency(dep);
						return true;
					}
			}
		});
	}
};
