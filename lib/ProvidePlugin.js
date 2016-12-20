/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleParserHelpers = require("./ModuleParserHelpers");
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
				var request = definitions[name];
				var splittedName = name.split(".");
				if(splittedName.length > 0) {
					splittedName.slice(1).forEach(function(_, i) {
						var name = splittedName.slice(0, i + 1).join(".");
						parser.plugin("can-rename " + name, function() {
							return true;
						});
					});
				}
				parser.plugin("expression " + name, function(expr) {
					var nameIdentifier = name;
					var scopedName = name.indexOf(".") >= 0;
					if(scopedName) {
						nameIdentifier = "__webpack_provided_" + name.replace(/\./g, "_dot_");
					}
					if(!ModuleParserHelpers.addParsedVariable(this, nameIdentifier, "require(" + JSON.stringify(request) + ")")) {
						return false;
					}
					if(scopedName) {
						var dep = new ConstDependency(nameIdentifier, expr.range);
						dep.loc = expr.loc;
						this.state.current.addDependency(dep);
					}
					return true;
				});
			});
		});
	});
};
