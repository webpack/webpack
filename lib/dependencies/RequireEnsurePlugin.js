/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const RequireEnsureItemDependency = require("./RequireEnsureItemDependency");
const RequireEnsureDependency = require("./RequireEnsureDependency");

const NullFactory = require("../NullFactory");

const RequireEnsureDependenciesBlockParserPlugin = require("./RequireEnsureDependenciesBlockParserPlugin");

const ParserHelpers = require("../ParserHelpers");

class RequireEnsurePlugin {

	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			const normalModuleFactory = params.normalModuleFactory;

			compilation.dependencyFactories.set(RequireEnsureItemDependency, normalModuleFactory);
			compilation.dependencyTemplates.set(RequireEnsureItemDependency, new RequireEnsureItemDependency.Template());

			compilation.dependencyFactories.set(RequireEnsureDependency, new NullFactory());
			compilation.dependencyTemplates.set(RequireEnsureDependency, new RequireEnsureDependency.Template());

			params.normalModuleFactory.plugin("parser", (parser, parserOptions) => {

				if(typeof parserOptions.requireEnsure !== "undefined" && !parserOptions.requireEnsure)
					return;

				parser.apply(new RequireEnsureDependenciesBlockParserPlugin());
				parser.plugin("evaluate typeof require.ensure", ParserHelpers.evaluateToString("function"));
				parser.plugin("typeof require.ensure", ParserHelpers.toConstantDependency(JSON.stringify("function")));
			});
		});
	}
}
module.exports = RequireEnsurePlugin;
