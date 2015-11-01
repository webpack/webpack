/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AbstractPlugin = require("../AbstractPlugin");
var HarmonyImportDependency = require("./HarmonyImportDependency");
var HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");
var HarmonyAcceptImportDependency = require("./HarmonyAcceptImportDependency");
var HarmonyAcceptDependency = require("./HarmonyAcceptDependency");
var HarmonyModulesHelpers = require("./HarmonyModulesHelpers");

module.exports = AbstractPlugin.create({
	"import": function(statement, source) {
		var dep = new HarmonyImportDependency(source, HarmonyModulesHelpers.getNewModuleVar(this.state, source), statement.range);
		dep.loc = statement.loc;
		this.state.current.addDependency(dep);
		this.state.lastHarmonyImport = dep;
		return true;
	},
	"import specifier": function(statement, source, id, name) {
		this.scope.definitions.length--;
		this.scope.renames["$" + name] = "imported var";
		if(!this.state.harmonySpecifier) this.state.harmonySpecifier = {};
		this.state.harmonySpecifier["$" + name] = [this.state.lastHarmonyImport, HarmonyModulesHelpers.getModuleVar(this.state, source), id];
		return true;
	},
	"expression imported var": function(expr) {
		var name = expr.name;
		var settings = this.state.harmonySpecifier["$" + name];
		var dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], settings[2], name, expr.range);
		dep.loc = expr.loc;
		this.state.current.addDependency(dep);
		return true;
	},
	"hot accept callback": function(expr, requests) {
		var dependencies = requests.filter(function(request) {
			return HarmonyModulesHelpers.checkModuleVar(this.state, request);
		}, this).map(function(request) {
			var dep = new HarmonyAcceptImportDependency(request, HarmonyModulesHelpers.getModuleVar(this.state, request), expr.range);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return dep;
		}, this);
		if(dependencies.length > 0) {
			var dep = new HarmonyAcceptDependency(expr.range, dependencies);
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
		}
	}
});
