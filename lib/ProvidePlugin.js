/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleParserHelpers = require("./ModuleParserHelpers");
var ModuleFilenameHelpers = require("./ModuleFilenameHelpers");
var ConstDependency = require("./dependencies/ConstDependency");

var NullFactory = require("./NullFactory");

function ProvidePlugin(definitions, options) {
	this.definitions = definitions;
	this.options = options;
}
module.exports = ProvidePlugin;
ProvidePlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.plugin("compilation", function(compilation) {
		compilation.dependencyFactories.set(ConstDependency, new NullFactory());
		compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
	});
	Object.keys(this.definitions).forEach(function(name) {
		var request = this.definitions[name];
		var splittedName = name.split(".");
		if(splittedName.length > 0) {
			splittedName.slice(1).forEach(function(_, i) {
				var name = splittedName.slice(0, i + 1).join(".");
				compiler.parser.plugin("can-rename " + name, function() {
					return true;
				});
			});
		}
		compiler.parser.plugin("expression " + name, function(expr) {
			if(options && !ModuleFilenameHelpers.matchObject(options, this.state.current.resource)) {
				return true;
			}
			var nameIdentifier = name;
			var scopedName = name.indexOf(".") >= 0;
			if(scopedName) {
				nameIdentifier = "__webpack_provided_" + name.replace(/\./g, "_dot_");
			}
			if(!ModuleParserHelpers.addParsedVariable(this, nameIdentifier, "require(" + JSON.stringify(request) + ")")) {
				return false;
			}
			if(scopedName) {
				nameIdentifier = "__webpack_provided_" + name.replace(/\./g, "_dot_");
				var dep = new ConstDependency(nameIdentifier, expr.range);
				dep.loc = expr.loc;
				this.state.current.addDependency(dep);
			}
			return true;
		});
	}, this);
};
