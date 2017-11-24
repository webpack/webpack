/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConstDependency = require("./dependencies/ConstDependency");

const NullFactory = require("./NullFactory");

class CompatibilityPlugin {

	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

			params.normalModuleFactory.plugin("parser javascript/auto", (parser, parserOptions) => {

				if(typeof parserOptions.browserify !== "undefined" && !parserOptions.browserify)
					return;

				parser.plugin("call require", (expr) => {
					// support for browserify style require delegator: "require(o, !0)"
					if(expr.arguments.length !== 2) return;
					const second = parser.evaluateExpression(expr.arguments[1]);
					if(!second.isBoolean()) return;
					if(second.asBool() !== true) return;
					const dep = new ConstDependency("require", expr.callee.range);
					dep.loc = expr.loc;
					if(parser.state.current.dependencies.length > 1) {
						const last = parser.state.current.dependencies[parser.state.current.dependencies.length - 1];
						if(last.critical && last.options && last.options.request === "." && last.userRequest === "." && last.options.recursive)
							parser.state.current.dependencies.pop();
					}
					parser.state.current.addDependency(dep);
					return true;
				});
			});
		});
	}
}
module.exports = CompatibilityPlugin;
