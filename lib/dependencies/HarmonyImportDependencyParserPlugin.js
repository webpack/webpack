/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AbstractPlugin = require("../AbstractPlugin");
var HarmonyImportDependency = require("./HarmonyImportDependency");
var HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");
var HarmonyModulesHelpers = require("./HarmonyModulesHelpers");

module.exports = AbstractPlugin.create({
	"import": function(statement, source) {
		var dep = new HarmonyImportDependency(source, HarmonyModulesHelpers.getNewModuleVar(this.state, source), statement.range);
		dep.loc = statement.loc;
		this.state.current.addDependency(dep);
		return true;
	},
	"import specifier": function(statement, source, id, name) {
		this.scope.definitions.length--;
		this.scope.renames["$" + name] = "imported var";
		if(!this.state.harmonySpecifier) this.state.harmonySpecifier = {};
		this.state.harmonySpecifier["$" + name] = [HarmonyModulesHelpers.getModuleVar(this.state, source), id];
		return true;
	},
	"expression imported var": function(expr) {
		var name = expr.name;
		var settings = this.state.harmonySpecifier["$" + name];
		var dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], name, expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	}
});
