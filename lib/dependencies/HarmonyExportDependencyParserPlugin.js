"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const HarmonyExportExpressionDependency = require("./HarmonyExportExpressionDependency");
const HarmonyExportHeaderDependency = require("./HarmonyExportHeaderDependency");
const HarmonyExportSpecifierDependency = require("./HarmonyExportSpecifierDependency");
const HarmonyExportImportedSpecifierDependency = require("./HarmonyExportImportedSpecifierDependency");
const HarmonyImportDependency = require("./HarmonyImportDependency");
const HarmonyModulesHelpers = require("./HarmonyModulesHelpers");
const HarmonyCompatiblilityDependency = require("./HarmonyCompatiblilityDependency");
function makeHarmonyModule(module, loc) {
	if(!module.meta.harmonyModule) {
		const dep = new HarmonyCompatiblilityDependency(module);
		dep.loc = loc;
		module.addDependency(dep);
		module.meta.harmonyModule = true;
		module.strict = true;
	}
}
class HarmonyExportDependencyParserPlugin {
	apply(parser) {
		parser.plugin("export", function(statement) {
			const dep = new HarmonyExportHeaderDependency(statement.declaration && statement.declaration.range, statement.range);
			dep.loc = statement.loc;
			this.state.current.addDependency(dep);
			makeHarmonyModule(this.state.module, statement.loc);
			return true;
		});
		parser.plugin("export import", function(statement, source) {
			const dep = new HarmonyImportDependency(source, HarmonyModulesHelpers.getNewModuleVar(this.state, source), statement.range);
			dep.loc = statement.loc;
			this.state.current.addDependency(dep);
			// todo: typo
			this.state.lastHarmoryImport = dep;
			makeHarmonyModule(this.state.module, statement.loc);
			return true;
		});
		parser.plugin("export expression", function(statement, expr) {
			const dep = new HarmonyExportExpressionDependency(this.state.module, expr.range, statement.range);
			dep.loc = statement.loc;
			this.state.current.addDependency(dep);
			this.state.module.strict = true;
			return true;
		});
		parser.plugin("export declaration", function(statement) {
		});
		parser.plugin("export specifier", function(statement, id, name) {
			const rename = this.scope.renames[`$${id}`];
			let dep;
			if(rename === "imported var") {
				const settings = this.state.harmonySpecifier[`$${id}`];
				dep = new HarmonyExportImportedSpecifierDependency(this.state.module, settings[0], settings[1], settings[2], name);
			} else {
				const immutable = statement.declaration && isImmutableStatement(statement.declaration);
				const hoisted = statement.declaration && isHoistedStatement(statement.declaration);
				dep = new HarmonyExportSpecifierDependency(this.state.module, id, name, !immutable || hoisted
					? -0.5
					: statement.range[1] + 0.5, immutable);
			}
			dep.loc = statement.loc;
			this.state.current.addDependency(dep);
			return true;
		});
		parser.plugin("export import specifier", function(statement, source, id, name) {
			// todo: here has typo
			const dep = new HarmonyExportImportedSpecifierDependency(this.state.module, this.state.lastHarmoryImport, HarmonyModulesHelpers.getModuleVar(this.state, source), id, name);
			dep.loc = statement.loc;
			this.state.current.addDependency(dep);
			return true;
		});
	}
}
function isImmutableStatement(statement) {
	if(statement.type === "FunctionDeclaration") {
		return true;
	}
	if(statement.type === "ClassDeclaration") {
		return true;
	}
	if(statement.type === "VariableDeclaration" && statement.kind === "const") {
		return true;
	}
	return false;
}
function isHoistedStatement(statement) {
	if(statement.type === "FunctionDeclaration") {
		return true;
	}
	return false;
}
module.exports = HarmonyExportDependencyParserPlugin;
