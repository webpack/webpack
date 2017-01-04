"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const RequireIncludeDependency = require("./RequireIncludeDependency");
class RequireIncludeDependencyParserPlugin {
	apply(parser) {
		parser.plugin("call require.include", function(expr) {
			if(expr.arguments.length !== 1) {
				return;
			}
			const param = this.evaluateExpression(expr.arguments[0]);
			if(!param.isString()) {
				return;
			}
			const dep = new RequireIncludeDependency(param.string, expr.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return true;
		});
	}
}
module.exports = RequireIncludeDependencyParserPlugin;
