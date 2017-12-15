/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ParserHelpers = require("./ParserHelpers");
const ConstDependency = require("./dependencies/ConstDependency");
const NullFactory = require("./NullFactory");

module.exports = class RequireJsStuffPlugin {

	apply(compiler) {
		compiler.hooks.compilation.tap("RequireJsStuffPlugin", (compilation, {
			normalModuleFactory
		}) => {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
			const handler = (parser, parserOptions) => {
				if(typeof parserOptions.requireJs !== "undefined" && !parserOptions.requireJs)
					return;

				parser.plugin("call require.config", ParserHelpers.toConstantDependency(parser, "undefined"));
				parser.plugin("call requirejs.config", ParserHelpers.toConstantDependency(parser, "undefined"));

				parser.plugin("expression require.version", ParserHelpers.toConstantDependency(parser, JSON.stringify("0.0.0")));
				parser.plugin("expression requirejs.onError", ParserHelpers.toConstantDependencyWithWebpackRequire(parser, "__webpack_require__.oe"));
			};
			normalModuleFactory.hooks.parser.for("javascript/auto").tap("RequireJsStuffPlugin", handler);
			normalModuleFactory.hooks.parser.for("javascript/dynamic").tap("RequireJsStuffPlugin", handler);
		});
	}

};
