/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const CommonJsRequireDependency = require("./CommonJsRequireDependency");
const CommonJsRequireContextDependency = require("./CommonJsRequireContextDependency");
const RequireHeaderDependency = require("./RequireHeaderDependency");
const LocalModuleDependency = require("./LocalModuleDependency");
const ContextDependencyHelpers = require("./ContextDependencyHelpers");
const LocalModulesHelpers = require("./LocalModulesHelpers");
const ParserHelpers = require("../ParserHelpers");

class CommonJsRequireDependencyParserPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(parser) {
		const options = this.options;
		parser.plugin("expression require.cache", ParserHelpers.toConstantDependency("__webpack_require__.c"));
		parser.plugin("expression require", (expr) => {
			const dep = new CommonJsRequireContextDependency(options.unknownContextRequest, options.unknownContextRecursive, options.unknownContextRegExp, expr.range);
			dep.critical = options.unknownContextCritical && "require function is used in a way in which dependencies cannot be statically extracted";
			dep.loc = expr.loc;
			dep.optional = !!parser.scope.inTry;
			parser.state.current.addDependency(dep);
			return true;
		});
		parser.plugin("call require", (expr) => {
			if(expr.arguments.length !== 1) return;
			let localModule;
			const param = parser.evaluateExpression(expr.arguments[0]);
			if(param.isConditional()) {
				let isExpression = false;
				const prevLength = parser.state.current.dependencies.length;
				const dep = new RequireHeaderDependency(expr.callee.range);
				dep.loc = expr.loc;
				parser.state.current.addDependency(dep);
				param.options.forEach(function(param) {
					const result = parser.applyPluginsBailResult("call require:commonjs:item", expr, param);
					if(result === undefined) {
						isExpression = true;
					}
				});
				if(isExpression) {
					parser.state.current.dependencies.length = prevLength;
				} else {
					return true;
				}
			}
			if(param.isString() && (localModule = LocalModulesHelpers.getLocalModule(parser.state, param.string))) {
				const dep = new LocalModuleDependency(localModule, expr.range);
				dep.loc = expr.loc;
				parser.state.current.addDependency(dep);
				return true;
			} else {
				const result = parser.applyPluginsBailResult("call require:commonjs:item", expr, param);
				if(result === undefined) {
					parser.applyPluginsBailResult("call require:commonjs:context", expr, param);
				} else {
					const dep = new RequireHeaderDependency(expr.callee.range);
					dep.loc = expr.loc;
					parser.state.current.addDependency(dep);
				}
				return true;
			}
		});
		parser.plugin("call require:commonjs:item", (expr, param) => {
			if(param.isString()) {
				const dep = new CommonJsRequireDependency(param.string, param.range);
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			}
		});
		parser.plugin("call require:commonjs:context", (expr, param) => {
			const dep = ContextDependencyHelpers.create(CommonJsRequireContextDependency, expr.range, param, expr, options);
			if(!dep) return;
			dep.loc = expr.loc;
			dep.optional = !!parser.scope.inTry;
			parser.state.current.addDependency(dep);
			return true;
		});
	}
}
module.exports = CommonJsRequireDependencyParserPlugin;
