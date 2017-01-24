/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConstDependency = require("./dependencies/ConstDependency");
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const NullFactory = require("./NullFactory");

const getQuery = (request) => {
	const i = request.indexOf("?");
	return request.indexOf("?") < 0 ? "" : request.substr(i);
};

class ConstPlugin {
	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

			params.normalModuleFactory.plugin("parser", parser => {
				parser.plugin("statement if", function(statement) {
					const param = this.evaluateExpression(statement.test);
					const bool = param.asBool();
					if(typeof bool === "boolean") {
						if(statement.test.type !== "Literal") {
							const dep = new ConstDependency(`${bool}`, param.range);
							dep.loc = statement.loc;
							this.state.current.addDependency(dep);
						}
						return bool;
					}
				});
				parser.plugin("expression ?:", function(expression) {
					const param = this.evaluateExpression(expression.test);
					const bool = param.asBool();
					if(typeof bool === "boolean") {
						if(expression.test.type !== "Literal") {
							const dep = new ConstDependency(` ${bool}`, param.range);
							dep.loc = expression.loc;
							this.state.current.addDependency(dep);
						}
						return bool;
					}
				});
				parser.plugin("evaluate Identifier __resourceQuery", function(expr) {
					if(!this.state.module) return;
					const res = new BasicEvaluatedExpression();
					res.setString(getQuery(this.state.module.resource));
					res.setRange(expr.range);
					return res;
				});
				parser.plugin("expression __resourceQuery", function() {
					if(!this.state.module) return;
					this.state.current.addVariable("__resourceQuery", JSON.stringify(getQuery(this.state.module.resource)));
					return true;
				});
			});
		});
	}
}

module.exports = ConstPlugin;
