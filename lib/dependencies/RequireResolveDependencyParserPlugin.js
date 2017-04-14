/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const RequireResolveDependency = require("./RequireResolveDependency");
const RequireResolveContextDependency = require("./RequireResolveContextDependency");
const RequireResolveHeaderDependency = require("./RequireResolveHeaderDependency");
const ContextDependencyHelpers = require("./ContextDependencyHelpers");

class RequireResolveDependencyParserPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(parser) {
		const options = this.options;
		parser.plugin("call require.resolve", (expr) => {
			return parser.applyPluginsBailResult("call require.resolve(Weak)", expr, false);
		});
		parser.plugin("call require.resolveWeak", (expr) => {
			return parser.applyPluginsBailResult("call require.resolve(Weak)", expr, true);
		});
		parser.plugin("call require.resolve(Weak)", (expr, weak) => {
			if(expr.arguments.length !== 1) return;
			const param = parser.evaluateExpression(expr.arguments[0]);
			if(param.isConditional()) {
				param.options.forEach((option) => {
					const result = parser.applyPluginsBailResult("call require.resolve(Weak):item", expr, option, weak);
					if(result === undefined) {
						parser.applyPluginsBailResult("call require.resolve(Weak):context", expr, option, weak);
					}
				});
				const dep = new RequireResolveHeaderDependency(expr.callee.range);
				dep.loc = expr.loc;
				parser.state.current.addDependency(dep);
				return true;
			} else {
				const result = parser.applyPluginsBailResult("call require.resolve(Weak):item", expr, param, weak);
				if(result === undefined) {
					parser.applyPluginsBailResult("call require.resolve(Weak):context", expr, param, weak);
				}
				const dep = new RequireResolveHeaderDependency(expr.callee.range);
				dep.loc = expr.loc;
				parser.state.current.addDependency(dep);
				return true;
			}
		});
		parser.plugin("call require.resolve(Weak):item", (expr, param, weak) => {
			if(param.isString()) {
				const dep = new RequireResolveDependency(param.string, param.range);
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				dep.weak = weak;
				parser.state.current.addDependency(dep);
				return true;
			}
		});
		parser.plugin("call require.resolve(Weak):context", (expr, param, weak) => {
			const dep = ContextDependencyHelpers.create(RequireResolveContextDependency, param.range, param, expr, options);
			if(!dep) return;
			dep.loc = expr.loc;
			dep.optional = !!parser.scope.inTry;
			dep.weak = weak;
			parser.state.current.addDependency(dep);
			return true;
		});
	}
}
module.exports = RequireResolveDependencyParserPlugin;
