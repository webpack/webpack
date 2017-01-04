"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const HarmonyCompatiblilityDependency = require("./HarmonyCompatiblilityDependency");
const HarmonyImportDependency = require("./HarmonyImportDependency");
const HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");
const HarmonyAcceptImportDependency = require("./HarmonyAcceptImportDependency");
const HarmonyAcceptDependency = require("./HarmonyAcceptDependency");
const HarmonyModulesHelpers = require("./HarmonyModulesHelpers");
function makeHarmonyModule(module, loc) {
	if(!module.meta.harmonyModule) {
		const dep = new HarmonyCompatiblilityDependency(module);
		dep.loc = loc;
		module.addDependency(dep);
		module.meta.harmonyModule = true;
		module.strict = true;
	}
}
class HarmonyImportDependencyParserPlugin {
	apply(parser) {
		parser.plugin("import", function(statement, source) {
			makeHarmonyModule(this.state.module, statement.loc);
			const dep = new HarmonyImportDependency(source, HarmonyModulesHelpers.getNewModuleVar(this.state, source), statement.range);
			dep.loc = statement.loc;
			this.state.current.addDependency(dep);
			this.state.lastHarmonyImport = dep;
			this.state.module.strict = true;
			return true;
		});
		parser.plugin("import specifier", function(statement, source, id, name) {
			this.scope.definitions.length--;
			this.scope.renames[`$${name}`] = "imported var";
			if(!this.state.harmonySpecifier) {
				this.state.harmonySpecifier = {};
			}
			this.state.harmonySpecifier[`$${name}`] = [
				this.state.lastHarmonyImport,
				HarmonyModulesHelpers.getModuleVar(this.state, source),
				id
			];
			return true;
		});
		parser.plugin("expression imported var", function(expr) {
			const name = expr.name;
			const settings = this.state.harmonySpecifier[`$${name}`];
			const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], settings[2], name, expr.range);
			dep.shorthand = this.scope.inShorthand;
			dep.directImport = true;
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return true;
		});
		parser.plugin("expression imported var.*", function(expr) {
			const name = expr.object.name;
			const settings = this.state.harmonySpecifier[`$${name}`];
			if(settings[2] !== null) {
				return false;
			}
			const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], expr.property.name || expr.property.value, name, expr.range);
			dep.shorthand = this.scope.inShorthand;
			dep.directImport = false;
			dep.loc = expr.loc;
			this.state.current.addDependency(dep);
			return true;
		});
		parser.plugin("call imported var", function(expr) {
			const args = expr.arguments;
			const fullExpr = expr;
			const exprCalle = expr.callee;
			const name = exprCalle.name;
			const settings = this.state.harmonySpecifier[`$${name}`];
			const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], settings[2], name, exprCalle.range);
			dep.directImport = true;
			dep.callArgs = args;
			dep.call = fullExpr;
			dep.loc = exprCalle.loc;
			this.state.current.addDependency(dep);
			if(args) {
				this.walkExpressions(args);
			}
			return true;
		});
		parser.plugin("hot accept callback", function(expr, requests) {
			const dependencies = requests
				.filter(function(request) {
					return HarmonyModulesHelpers.checkModuleVar(this.state, request);
				}, this)
				.map(function(request) {
					const dep = new HarmonyAcceptImportDependency(request, HarmonyModulesHelpers.getModuleVar(this.state, request), expr.range);
					dep.loc = expr.loc;
					this.state.current.addDependency(dep);
					return dep;
				}, this);
			if(dependencies.length > 0) {
				const dep = new HarmonyAcceptDependency(expr.range, dependencies, true);
				dep.loc = expr.loc;
				this.state.current.addDependency(dep);
			}
		});
		parser.plugin("hot accept without callback", function(expr, requests) {
			const dependencies = requests
				.filter(function(request) {
					return HarmonyModulesHelpers.checkModuleVar(this.state, request);
				}, this)
				.map(function(request) {
					const dep = new HarmonyAcceptImportDependency(request, HarmonyModulesHelpers.getModuleVar(this.state, request), expr.range);
					dep.loc = expr.loc;
					this.state.current.addDependency(dep);
					return dep;
				}, this);
			if(dependencies.length > 0) {
				const dep = new HarmonyAcceptDependency(expr.range, dependencies, false);
				dep.loc = expr.loc;
				this.state.current.addDependency(dep);
			}
		});
	}
}
module.exports = HarmonyImportDependencyParserPlugin;
