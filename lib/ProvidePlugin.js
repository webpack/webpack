/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ParserHelpers = require("./ParserHelpers");
var ConstDependency = require("./dependencies/ConstDependency");

var NullFactory = require("./NullFactory");

function ProvidePlugin(definitions) {
	this.definitions = definitions;
}
module.exports = ProvidePlugin;
ProvidePlugin.prototype.apply = function(compiler) {
	var definitions = this.definitions;
	compiler.plugin("compilation", function(compilation, params) {
		compilation.dependencyFactories.set(ConstDependency, new NullFactory());
		compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
		params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {
			Object.keys(definitions).forEach(function(name) {
				var request = [].concat(definitions[name]);
				var splittedName = name.split(".");
				if(splittedName.length > 0) {
					splittedName.slice(1).forEach(function(_, i) {
						var name = splittedName.slice(0, i + 1).join(".");
						parser.plugin("can-rename " + name, ParserHelpers.approve);
					});
				}
				parser.plugin("expression " + name, function(expr) {
					var nameIdentifier = name;
					var scopedName = name.indexOf(".") >= 0;
					var expression = "require(" + JSON.stringify(request[0]) + ")";
					if(scopedName) {
						nameIdentifier = "__webpack_provided_" + name.replace(/\./g, "_dot_");
					}
					if(request.length > 1) {
						expression += request.slice(1).map(function(r) {
							return "[" + JSON.stringify(r) + "]";
						}).join("");
					}
					if(!ParserHelpers.addParsedVariableToModule(this, nameIdentifier, expression)) {
						return false;
					}
					if(scopedName) {
						ParserHelpers.toConstantDependency(nameIdentifier).bind(this)(expr);
					}
					return true;
				});
			});
		});
	});
};
