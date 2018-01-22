/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const AMDRequireItemDependency = require("./AMDRequireItemDependency");
const AMDRequireArrayDependency = require("./AMDRequireArrayDependency");
const AMDRequireContextDependency = require("./AMDRequireContextDependency");
const AMDRequireDependenciesBlock = require("./AMDRequireDependenciesBlock");
const UnsupportedDependency = require("./UnsupportedDependency");
const LocalModuleDependency = require("./LocalModuleDependency");
const ContextDependencyHelpers = require("./ContextDependencyHelpers");
const LocalModulesHelpers = require("./LocalModulesHelpers");
const ConstDependency = require("./ConstDependency");
const getFunctionExpression = require("./getFunctionExpression");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");

class AMDRequireDependenciesBlockParserPlugin {
	constructor(options) {
		this.options = options;
	}

	processFunctionArgument(parser, expression) {
		let bindThis = true;
		const fnData = getFunctionExpression(expression);
		if(fnData) {
			parser.inScope(fnData.fn.params.filter((i) => {
				return !["require", "module", "exports"].includes(i.name);
			}), () => {
				if(fnData.fn.body.type === "BlockStatement")
					parser.walkStatement(fnData.fn.body);
				else
					parser.walkExpression(fnData.fn.body);
			});
			parser.walkExpressions(fnData.expressions);
			if(fnData.needThis === false) {
				bindThis = false;
			}
		} else {
			parser.walkExpression(expression);
		}
		return bindThis;
	}

	apply(parser) {
		const options = this.options;

		const processArrayForRequestString = param => {
			if(param.isArray()) {
				const result = param.items.map(item => processItemForRequestString(item));
				if(result.every(Boolean))
					return result.join(" ");
			} else if(param.isConstArray()) {
				return param.array.join(" ");
			}
		};

		const processItemForRequestString = param => {
			if(param.isConditional()) {
				const result = param.options.map(item => processItemForRequestString(item));
				if(result.every(Boolean))
					return result.join("|");
			} else if(param.isString()) {
				return param.string;
			}
		};

		const processArray = (expr, param) => {
			if(param.isArray()) {
				param.items.forEach((param) => {
					const result = processItem(expr, param);
					if(result === undefined) {
						processContext(expr, param);
					}
				});
				return true;
			} else if(param.isConstArray()) {
				const deps = [];
				param.array.forEach((request) => {
					let dep, localModule;
					if(request === "require") {
						dep = "__webpack_require__";
					} else if(["exports", "module"].includes(request)) {
						dep = request;
					} else if(localModule = LocalModulesHelpers.getLocalModule(parser.state, request)) { // eslint-disable-line no-cond-assign
						dep = new LocalModuleDependency(localModule);
						dep.loc = expr.loc;
						parser.state.current.addDependency(dep);
					} else {
						dep = new AMDRequireItemDependency(request);
						dep.loc = expr.loc;
						dep.optional = !!parser.scope.inTry;
						parser.state.current.addDependency(dep);
					}
					deps.push(dep);
				});
				const dep = new AMDRequireArrayDependency(deps, param.range);
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			}
		};
		const processItem = (expr, param) => {
			if(param.isConditional()) {
				param.options.forEach((param) => {
					const result = processItem(expr, param);
					if(result === undefined) {
						processContext(expr, param);
					}
				});
				return true;
			} else if(param.isString()) {
				let dep, localModule;
				if(param.string === "require") {
					dep = new ConstDependency("__webpack_require__", param.string);
				} else if(param.string === "module") {
					dep = new ConstDependency(parser.state.module.buildInfo.moduleArgument, param.range);
				} else if(param.string === "exports") {
					dep = new ConstDependency(parser.state.module.buildInfo.exportsArgument, param.range);
				} else if(localModule = LocalModulesHelpers.getLocalModule(parser.state, param.string)) { // eslint-disable-line no-cond-assign
					dep = new LocalModuleDependency(localModule, param.range);
				} else {
					dep = new AMDRequireItemDependency(param.string, param.range);
				}
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			}
		};
		const processContext = (expr, param) => {
			const dep = ContextDependencyHelpers.create(AMDRequireContextDependency, param.range, param, expr, options);
			if(!dep) return;
			dep.loc = expr.loc;
			dep.optional = !!parser.scope.inTry;
			parser.state.current.addDependency(dep);
			return true;
		};

		parser.hooks.call.for("require").tap("AMDRequireDependenciesBlockParserPlugin", (expr) => {
			let param;
			let dep;
			let result;

			const old = parser.state.current;

			if(expr.arguments.length >= 1) {
				param = parser.evaluateExpression(expr.arguments[0]);
				dep = new AMDRequireDependenciesBlock(
					expr,
					param.range,
					(expr.arguments.length > 1) ? expr.arguments[1].range : null,
					(expr.arguments.length > 2) ? expr.arguments[2].range : null,
					parser.state.module,
					expr.loc,
					processArrayForRequestString(param)
				);
				parser.state.current = dep;
			}

			if(expr.arguments.length === 1) {
				parser.inScope([], () => {
					result = processArray(expr, param);
				});
				parser.state.current = old;
				if(!result) return;
				parser.state.current.addBlock(dep);
				return true;
			}

			if(expr.arguments.length === 2 || expr.arguments.length === 3) {
				try {
					parser.inScope([], () => {
						result = processArray(expr, param);
					});
					if(!result) {
						dep = new UnsupportedDependency("unsupported", expr.range);
						old.addDependency(dep);
						if(parser.state.module)
							parser.state.module.errors.push(new UnsupportedFeatureWarning(parser.state.module, "Cannot statically analyse 'require(..., ...)' in line " + expr.loc.start.line));
						dep = null;
						return true;
					}
					dep.functionBindThis = this.processFunctionArgument(parser, expr.arguments[1]);
					if(expr.arguments.length === 3) {
						dep.errorCallbackBindThis = this.processFunctionArgument(parser, expr.arguments[2]);
					}
				} finally {
					parser.state.current = old;
					if(dep)
						parser.state.current.addBlock(dep);
				}
				return true;
			}
		});
	}
}
module.exports = AMDRequireDependenciesBlockParserPlugin;
