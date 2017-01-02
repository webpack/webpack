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
			switch(expr.arguments.length) {
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
						const dep = new RequireContextDependency(requestExpr.string, recursive, regExp, expr.range);
						dep.loc = expr.loc;
						dep.optional = parser.scope.inTry;
						parser.state.current.addDependency(dep);
						return true;
					}
			}
		});
	}
};
