/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var AbstractPlugin = require("../AbstractPlugin");
var HarmonyCompatiblilityDependency = require("./HarmonyCompatiblilityDependency");
var HarmonyExportExpressionDependency = require("./HarmonyExportExpressionDependency");
var HarmonyExportHeaderDependency = require("./HarmonyExportHeaderDependency");
var HarmonyExportSpecifierDependency = require("./HarmonyExportSpecifierDependency");
var HarmonyExportImportedSpecifierDependency = require("./HarmonyExportImportedSpecifierDependency");
var HarmonyImportDependency = require("./HarmonyImportDependency");
var HarmonyModulesHelpers = require("./HarmonyModulesHelpers");

function makeHarmonyModule(module, loc) {
	if(!module.meta.harmonyModule) {
		var dep = new HarmonyCompatiblilityDependency(module);
		dep.loc = loc;
		module.addDependency(dep);
		module.meta.harmonyModule = true;
		module.strict = true;
	}
}

module.exports = AbstractPlugin.create({
	"export": function(statement) {
		var dep = new HarmonyExportHeaderDependency(statement.declaration && statement.declaration.range, statement.range);
		dep.loc = statement.loc;
		this.state.current.addDependency(dep);
		makeHarmonyModule(this.state.module, statement.loc);
		return true;
	},
	"export import": function(statement, source) {
		var dep = new HarmonyImportDependency(source, HarmonyModulesHelpers.getNewModuleVar(this.state, source), statement.range);
		dep.loc = statement.loc;
		this.state.current.addDependency(dep);
		this.state.lastHarmoryImport = dep;
		makeHarmonyModule(this.state.module, statement.loc);
		return true;
	},
	"export expression": function(statement, expr) {
		var dep = new HarmonyExportExpressionDependency(this.state.module, expr.range, statement.range);
		dep.loc = statement.loc;
		this.state.current.addDependency(dep);
		this.state.module.strict = true;
		return true;
	},
	"export declaration": function(statement) {},
	"export specifier": function(statement, id, name) {
		var rename = this.scope.renames["$" + id];
		var dep;
		if(rename === "imported var") {
			var settings = this.state.harmonySpecifier["$" + id];
			dep = new HarmonyExportImportedSpecifierDependency(this.state.module, settings[0], settings[1], settings[2], name);
		} else {
			var immutable = statement.declaration && isImmutableStatement(statement.declaration);
			var hoisted = statement.declaration && isHoistedStatement(statement.declaration);
			dep = new HarmonyExportSpecifierDependency(this.state.module, id, name, !immutable || hoisted ? -0.5 : (statement.range[1] + 0.5), immutable);
		}
		dep.loc = statement.loc;
		this.state.current.addDependency(dep);
		return true;
	},
	"export import specifier": function(statement, source, id, name) {
		var dep = new HarmonyExportImportedSpecifierDependency(this.state.module, this.state.lastHarmoryImport, HarmonyModulesHelpers.getModuleVar(this.state, source), id, name);
		dep.loc = statement.loc;
		this.state.current.addDependency(dep);
		return true;
	}
});

function isImmutableStatement(statement) {
	if(statement.type === "FunctionDeclaration") return true;
	if(statement.type === "ClassDeclaration") return true;
	if(statement.type === "VariableDeclaration" && statement.kind === "const") return true;
	return false;
}

function isHoistedStatement(statement) {
	if(statement.type === "FunctionDeclaration") return true;
	return false;
}
