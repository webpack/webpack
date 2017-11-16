/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ConstDependency = require("./dependencies/ConstDependency");
const NullFactory = require("./NullFactory");
const ParserHelpers = require("./ParserHelpers");

const getQuery = (request) => {
	const i = request.indexOf("?");
	return request.indexOf("?") < 0 ? "" : request.substr(i);
};

class ConstPlugin {
	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

			params.normalModuleFactory.plugin(["parser javascript/auto", "parser javascript/dynamic", "parser javascript/esm"], parser => {
				parser.plugin("statement if", statement => {
					const param = parser.evaluateExpression(statement.test);
					const bool = param.asBool();
					if(typeof bool === "boolean") {
						if(statement.test.type !== "Literal") {
							const dep = new ConstDependency(`${bool}`, param.range);
							dep.loc = statement.loc;
							parser.state.current.addDependency(dep);
						}
						return bool;
					}
				});
				parser.plugin("expression ?:", expression => {
					const param = parser.evaluateExpression(expression.test);
					const bool = param.asBool();
					if(typeof bool === "boolean") {
						if(expression.test.type !== "Literal") {
							const dep = new ConstDependency(` ${bool}`, param.range);
							dep.loc = expression.loc;
							parser.state.current.addDependency(dep);
						}
						return bool;
					}
				});
				parser.plugin("evaluate Identifier __resourceQuery", expr => {
					if(!parser.state.module) return;
					return ParserHelpers.evaluateToString(getQuery(parser.state.module.resource))(expr);
				});
				parser.plugin("expression __resourceQuery", () => {
					if(!parser.state.module) return;
					parser.state.current.addVariable("__resourceQuery", JSON.stringify(getQuery(parser.state.module.resource)));
					return true;
				});
			});
		});
	}
}

module.exports = ConstPlugin;
