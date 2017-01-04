"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
/* eslint-disable no-case-declarations */
const RequireContextDependency = require("./RequireContextDependency");
class RequireContextDependencyParserPlugin {
	apply(parser) {
		parser.plugin("call require.context", function(expr) {
			let regExp = /^\.\/.*$/;
			let recursive = true;
			switch(expr.arguments.length) {
				case 3:
					const regExpExpr = this.evaluateExpression(expr.arguments[2]);
					if(!regExpExpr.isRegExp()) {
						return;
					}
					regExp = regExpExpr.regExp;
				// falls through
				case 2:
					const recursiveExpr = this.evaluateExpression(expr.arguments[1]);
					if(!recursiveExpr.isBoolean()) {
						return;
					}
					recursive = recursiveExpr.bool;
				// falls through
				case 1:
					const requestExpr = this.evaluateExpression(expr.arguments[0]);
					if(!requestExpr.isString()) {
						return;
					}
					const dep = new RequireContextDependency(requestExpr.string, recursive, regExp, expr.range);
					dep.loc = expr.loc;
					dep.optional = this.scope.inTry;
					this.state.current.addDependency(dep);
					return true;
			}
		});
	}
}
module.exports = RequireContextDependencyParserPlugin;
