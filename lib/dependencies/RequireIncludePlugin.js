/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
var RequireIncludeDependency = require("./RequireIncludeDependency");
var RequireIncludeDependencyParserPlugin = require("./RequireIncludeDependencyParserPlugin");
var ConstDependency = require("./ConstDependency");

const ParserHelpers = require("../ParserHelpers");

function RequireIncludePlugin() {}
module.exports = RequireIncludePlugin;

RequireIncludePlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(RequireIncludeDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(RequireIncludeDependency, new RequireIncludeDependency.Template());

		params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {

			if(typeof parserOptions.requireInclude !== "undefined" && !parserOptions.requireInclude)
				return;

			parser.apply(new RequireIncludeDependencyParserPlugin());
			parser.plugin("evaluate typeof require.include", ParserHelpers.evaluateToString("function"));
			parser.plugin("typeof require.include", function(expr) {
				var dep = new ConstDependency("'function'", expr.range);
				dep.loc = expr.loc;
				this.state.current.addDependency(dep);
				return true;
			});

		});
	});
};
