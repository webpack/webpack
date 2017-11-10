/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ConstDependency = require("./dependencies/ConstDependency");
const NullFactory = require("./NullFactory");
// const ParserHelpers = require("./ParserHelpers");

const parserHelpersLocation = require.resolve("./ParserHelpers");

class ConstPlugin {
	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

			params.normalModuleFactory.plugin("parser", parser => {

				parser.plugin("statement if", {
					path: parserHelpersLocation,
					fnName: "ConstStatementIf",
				});

				parser.plugin("expression ?:", {
					path: parserHelpersLocation,
					fnName: "ConstExpressionTernary",
				});

				parser.plugin("evaluate Identifier __resourceQuery", {
					path: parserHelpersLocation,
					fnName: "ConstEvaluateIdentifierResourceQuery",
				});

				parser.plugin("expression __resourceQuery", {
					path: parserHelpersLocation,
					fnName: "ConstExpressionResourceQuery",
				});
			});
		});
	}
}

module.exports = ConstPlugin;
