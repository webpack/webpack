/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AbstractPlugin = require("../AbstractPlugin");
var HarmonyExportExpressionDependency = require("./HarmonyExportExpressionDependency");
var HarmonyExportSpecifierDependency = require("./HarmonyExportSpecifierDependency");
var HarmonyImportDependency = require("./HarmonyImportDependency");
var HarmonyModulesHelpers = require("./HarmonyModulesHelpers");

module.exports = AbstractPlugin.create({
	"export": function(statement) {
		var dep = new HarmonyExportExpressionDependency(null, statement.declaration && statement.declaration.range, statement.range);
		dep.loc = statement.loc;
		this.state.current.addDependency(dep);
		return true;
	},
	"export import": function(statement, source) {
		var dep = new HarmonyImportDependency(source, HarmonyModulesHelpers.getNewModuleVar(this.state, source), statement.range);
		dep.loc = statement.loc;
		this.state.current.addDependency(dep);
		return true;
	},
	"export expression": function(statement, expr) {
		var dep = new HarmonyExportExpressionDependency("default", expr.range, statement.range);
		dep.loc = statement.loc;
		this.state.current.addDependency(dep);
		return true;
	},
	"export declaration": function() {
	},
	"export specifier": function(statement, id, name) {
		var dep = new HarmonyExportSpecifierDependency(null, id, name, statement.range[1] + 0.5);
		dep.loc = statement.loc;
		this.state.current.addDependency(dep);
		return true;
	},
	"export import specifier": function(statement, source, id, name) {
		var dep = new HarmonyExportSpecifierDependency(HarmonyModulesHelpers.getModuleVar(this.state, source), id, name, statement.range[1] + 0.5);
		dep.loc = statement.loc;
		this.state.current.addDependency(dep);
		return true;
	}
});

