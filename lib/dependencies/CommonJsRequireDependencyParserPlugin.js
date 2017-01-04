"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ConstDependency = require("./ConstDependency");
const CommonJsRequireDependency = require("./CommonJsRequireDependency");
const CommonJsRequireContextDependency = require("./CommonJsRequireContextDependency");
const RequireHeaderDependency = require("./RequireHeaderDependency");
const LocalModuleDependency = require("./LocalModuleDependency");
const ContextDependencyHelpers = require("./ContextDependencyHelpers");
const LocalModulesHelpers = require("./LocalModulesHelpers");
class CommonJsRequireDependencyParserPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(parser) {
		const options = this.options;
		parser.plugin("expression require.cache", function(expr) {
			const dep = new ConstDependency("__webpack_require__.c", expr.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return true;
		});
		parser.plugin("expression require", function(expr) {
			const dep = new CommonJsRequireContextDependency(options.unknownContextRequest, options.unknownContextRecursive, options.unknownContextRegExp, expr.range);
			dep.critical = options.unknownContextCritical && "require function is used in a way in which dependencies cannot be statically extracted";
			dep.loc = expr.loc;
			dep.optional = !!this.scope.inTry;
			this.state.current.addDependency(dep);
			return true;
		});
		parser.plugin("call require", function(expr) {
			if(expr.arguments.length !== 1) {
				return;
			}
			let localModule;
			let dep;
			const param = this.evaluateExpression(expr.arguments[0]);
			if(param.isConditional()) {
				let isExpression = false;
				const prevLength = this.state.current.dependencies.length;
				dep = new RequireHeaderDependency(expr.callee.range);
				dep.loc = expr.loc;
				this.state.current.addDependency(dep);
				param.options.forEach(function(param) {
					const result = this.applyPluginsBailResult("call require:commonjs:item", expr, param);
					if(result === undefined) {
						isExpression = true;
					}
				}, this);
				if(isExpression) {
					this.state.current.dependencies.length = prevLength;
				} else {
					return true;
				}
			}
			if(param.isString() && (localModule = LocalModulesHelpers.getLocalModule(this.state, param.string))) {
				dep = new LocalModuleDependency(localModule, expr.range);
				dep.loc = expr.loc;
				this.state.current.addDependency(dep);
				return true;
			} else {
				const result = this.applyPluginsBailResult("call require:commonjs:item", expr, param);
				if(result === undefined) {
					this.applyPluginsBailResult("call require:commonjs:context", expr, param);
				} else {
					dep = new RequireHeaderDependency(expr.callee.range);
					dep.loc = expr.loc;
					this.state.current.addDependency(dep);
				}
				return true;
			}
		});
		parser.plugin("call require:commonjs:item", function(expr, param) {
			if(param.isString()) {
				const dep = new CommonJsRequireDependency(param.string, param.range);
				dep.loc = expr.loc;
				dep.optional = !!this.scope.inTry;
				this.state.current.addDependency(dep);
				return true;
			}
		});
		parser.plugin("call require:commonjs:context", function(expr, param) {
			const dep = ContextDependencyHelpers.create(CommonJsRequireContextDependency, expr.range, param, expr, options);
			if(!dep) {
				return;
			}
			dep.loc = expr.loc;
			dep.optional = !!this.scope.inTry;
			this.state.current.addDependency(dep);
			return true;
		});
	}
}
module.exports = CommonJsRequireDependencyParserPlugin;
