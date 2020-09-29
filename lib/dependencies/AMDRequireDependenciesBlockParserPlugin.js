/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const UnsupportedFeatureWarning = require("../UnsupportedFeatureWarning");
const AMDRequireArrayDependency = require("./AMDRequireArrayDependency");
const AMDRequireContextDependency = require("./AMDRequireContextDependency");
const AMDRequireDependenciesBlock = require("./AMDRequireDependenciesBlock");
const AMDRequireDependency = require("./AMDRequireDependency");
const AMDRequireItemDependency = require("./AMDRequireItemDependency");
const ConstDependency = require("./ConstDependency");
const ContextDependencyHelpers = require("./ContextDependencyHelpers");
const LocalModuleDependency = require("./LocalModuleDependency");
const { getLocalModule } = require("./LocalModulesHelpers");
const UnsupportedDependency = require("./UnsupportedDependency");
const getFunctionExpression = require("./getFunctionExpression");

class AMDRequireDependenciesBlockParserPlugin {
	constructor(options) {
		this.options = options;
	}

	processFunctionArgument(parser, expression) {
		let bindThis = true;
		const fnData = getFunctionExpression(expression);
		if (fnData) {
			parser.inScope(
				fnData.fn.params.filter(i => {
					return !["require", "module", "exports"].includes(i.name);
				}),
				() => {
					if (fnData.fn.body.type === "BlockStatement") {
						parser.walkStatement(fnData.fn.body);
					} else {
						parser.walkExpression(fnData.fn.body);
					}
				}
			);
			parser.walkExpressions(fnData.expressions);
			if (fnData.needThis === false) {
				bindThis = false;
			}
		} else {
			parser.walkExpression(expression);
		}
		return bindThis;
	}

	apply(parser) {
		parser.hooks.call
			.for("require")
			.tap(
				"AMDRequireDependenciesBlockParserPlugin",
				this.processCallRequire.bind(this, parser)
			);
	}

	processArray(parser, expr, param) {
		if (param.isArray()) {
			for (const p of param.items) {
				const result = this.processItem(parser, expr, p);
				if (result === undefined) {
					this.processContext(parser, expr, p);
				}
			}
			return true;
		} else if (param.isConstArray()) {
			const deps = [];
			for (const request of param.array) {
				let dep, localModule;
				if (request === "require") {
					dep = "__webpack_require__";
				} else if (["exports", "module"].includes(request)) {
					dep = request;
				} else if ((localModule = getLocalModule(parser.state, request))) {
					localModule.flagUsed();
					dep = new LocalModuleDependency(localModule, undefined, false);
					dep.loc = expr.loc;
					parser.state.module.addPresentationalDependency(dep);
				} else {
					dep = this.newRequireItemDependency(request);
					dep.loc = expr.loc;
					dep.optional = !!parser.scope.inTry;
					parser.state.current.addDependency(dep);
				}
				deps.push(dep);
			}
			const dep = this.newRequireArrayDependency(deps, param.range);
			dep.loc = expr.loc;
			dep.optional = !!parser.scope.inTry;
			parser.state.module.addPresentationalDependency(dep);
			return true;
		}
	}
	processItem(parser, expr, param) {
		if (param.isConditional()) {
			for (const p of param.options) {
				const result = this.processItem(parser, expr, p);
				if (result === undefined) {
					this.processContext(parser, expr, p);
				}
			}
			return true;
		} else if (param.isString()) {
			let dep, localModule;
			if (param.string === "require") {
				dep = new ConstDependency("__webpack_require__", param.string, [
					RuntimeGlobals.require
				]);
			} else if (param.string === "module") {
				dep = new ConstDependency(
					parser.state.module.buildInfo.moduleArgument,
					param.range,
					[RuntimeGlobals.module]
				);
			} else if (param.string === "exports") {
				dep = new ConstDependency(
					parser.state.module.buildInfo.exportsArgument,
					param.range,
					[RuntimeGlobals.exports]
				);
			} else if ((localModule = getLocalModule(parser.state, param.string))) {
				localModule.flagUsed();
				dep = new LocalModuleDependency(localModule, param.range, false);
			} else {
				dep = this.newRequireItemDependency(param.string, param.range);
				dep.loc = expr.loc;
				dep.optional = !!parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			}
			dep.loc = expr.loc;
			parser.state.module.addPresentationalDependency(dep);
			return true;
		}
	}
	processContext(parser, expr, param) {
		const dep = ContextDependencyHelpers.create(
			AMDRequireContextDependency,
			param.range,
			param,
			expr,
			this.options,
			{
				category: "amd"
			},
			parser
		);
		if (!dep) return;
		dep.loc = expr.loc;
		dep.optional = !!parser.scope.inTry;
		parser.state.current.addDependency(dep);
		return true;
	}

	processArrayForRequestString(param) {
		if (param.isArray()) {
			const result = param.items.map(item =>
				this.processItemForRequestString(item)
			);
			if (result.every(Boolean)) return result.join(" ");
		} else if (param.isConstArray()) {
			return param.array.join(" ");
		}
	}

	processItemForRequestString(param) {
		if (param.isConditional()) {
			const result = param.options.map(item =>
				this.processItemForRequestString(item)
			);
			if (result.every(Boolean)) return result.join("|");
		} else if (param.isString()) {
			return param.string;
		}
	}

	processCallRequire(parser, expr) {
		let param;
		let depBlock;
		let dep;
		let result;

		const old = parser.state.current;

		if (expr.arguments.length >= 1) {
			param = parser.evaluateExpression(expr.arguments[0]);
			depBlock = this.newRequireDependenciesBlock(
				expr.loc,
				this.processArrayForRequestString(param)
			);
			dep = this.newRequireDependency(
				expr.range,
				param.range,
				expr.arguments.length > 1 ? expr.arguments[1].range : null,
				expr.arguments.length > 2 ? expr.arguments[2].range : null
			);
			dep.loc = expr.loc;
			depBlock.addDependency(dep);

			parser.state.current = depBlock;
		}

		if (expr.arguments.length === 1) {
			parser.inScope([], () => {
				result = this.processArray(parser, expr, param);
			});
			parser.state.current = old;
			if (!result) return;
			parser.state.current.addBlock(depBlock);
			return true;
		}

		if (expr.arguments.length === 2 || expr.arguments.length === 3) {
			try {
				parser.inScope([], () => {
					result = this.processArray(parser, expr, param);
				});
				if (!result) {
					const dep = new UnsupportedDependency("unsupported", expr.range);
					old.addPresentationalDependency(dep);
					if (parser.state.module) {
						parser.state.module.addError(
							new UnsupportedFeatureWarning(
								"Cannot statically analyse 'require(…, …)' in line " +
									expr.loc.start.line,
								expr.loc
							)
						);
					}
					depBlock = null;
					return true;
				}
				dep.functionBindThis = this.processFunctionArgument(
					parser,
					expr.arguments[1]
				);
				if (expr.arguments.length === 3) {
					dep.errorCallbackBindThis = this.processFunctionArgument(
						parser,
						expr.arguments[2]
					);
				}
			} finally {
				parser.state.current = old;
				if (depBlock) parser.state.current.addBlock(depBlock);
			}
			return true;
		}
	}

	newRequireDependenciesBlock(loc, request) {
		return new AMDRequireDependenciesBlock(loc, request);
	}
	newRequireDependency(
		outerRange,
		arrayRange,
		functionRange,
		errorCallbackRange
	) {
		return new AMDRequireDependency(
			outerRange,
			arrayRange,
			functionRange,
			errorCallbackRange
		);
	}
	newRequireItemDependency(request, range) {
		return new AMDRequireItemDependency(request, range);
	}
	newRequireArrayDependency(depsArray, range) {
		return new AMDRequireArrayDependency(depsArray, range);
	}
}
module.exports = AMDRequireDependenciesBlockParserPlugin;
