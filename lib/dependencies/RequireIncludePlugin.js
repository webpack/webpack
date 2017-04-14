/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const RequireIncludeDependency = require("./RequireIncludeDependency");
const RequireIncludeDependencyParserPlugin = require("./RequireIncludeDependencyParserPlugin");

const ParserHelpers = require("../ParserHelpers");

class RequireIncludePlugin {

	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			const normalModuleFactory = params.normalModuleFactory;

			compilation.dependencyFactories.set(RequireIncludeDependency, normalModuleFactory);
			compilation.dependencyTemplates.set(RequireIncludeDependency, new RequireIncludeDependency.Template());

			params.normalModuleFactory.plugin("parser", (parser, parserOptions) => {

				if(typeof parserOptions.requireInclude !== "undefined" && !parserOptions.requireInclude)
					return;

				parser.apply(new RequireIncludeDependencyParserPlugin());
				parser.plugin("evaluate typeof require.include", ParserHelpers.evaluateToString("function"));
				parser.plugin("typeof require.include", ParserHelpers.toConstantDependency(JSON.stringify("function")));
			});
		});
	}
}
module.exports = RequireIncludePlugin;
