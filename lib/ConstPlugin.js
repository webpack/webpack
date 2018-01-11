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
	return request.includes("?") ? request.substr(i) : "";
};

class ConstPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("ConstPlugin", (compilation, {
			normalModuleFactory
		}) => {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

			const handler = parser => {
				parser.hooks.statementIf.tap("ConstPlugin", statement => {
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
				parser.hooks.expressionConditionalOperator.tap("ConstPlugin", expression => {
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
				parser.hooks.evaluateIdentifier.for("__resourceQuery").tap("ConstPlugin", expr => {
					if(!parser.state.module) return;
					return ParserHelpers.evaluateToString(getQuery(parser.state.module.resource))(expr);
				});
				parser.hooks.expression.for("__resourceQuery").tap("ConstPlugin", () => {
					if(!parser.state.module) return;
					parser.state.current.addVariable("__resourceQuery", JSON.stringify(getQuery(parser.state.module.resource)));
					return true;
				});
			};

			normalModuleFactory.hooks.parser.for("javascript/auto").tap("ConstPlugin", handler);
			normalModuleFactory.hooks.parser.for("javascript/dynamic").tap("ConstPlugin", handler);
			normalModuleFactory.hooks.parser.for("javascript/esm").tap("ConstPlugin", handler);
		});
	}
}

module.exports = ConstPlugin;
