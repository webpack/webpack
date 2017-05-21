/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const HarmonyImportDependency = require("./HarmonyImportDependency");
const HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");
const HarmonyAcceptImportDependency = require("./HarmonyAcceptImportDependency");
const HarmonyAcceptDependency = require("./HarmonyAcceptDependency");
const HarmonyModulesHelpers = require("./HarmonyModulesHelpers");

module.exports = class HarmonyImportDependencyParserPlugin {
	constructor(moduleOptions) {
		this.strictExportPresence = moduleOptions.strictExportPresence;
		this.strictThisContextOnImports = moduleOptions.strictThisContextOnImports;
	}

	apply(parser) {
		parser.plugin("import", (statement, source) => {
			const dep = new HarmonyImportDependency(source, HarmonyModulesHelpers.getNewModuleVar(parser.state, source), statement.range);
			dep.loc = statement.loc;
			parser.state.current.addDependency(dep);
			parser.state.lastHarmonyImport = dep;
			return true;
		});
		parser.plugin("import specifier", (statement, source, id, name) => {
			parser.scope.definitions.length--;
			parser.scope.renames[`$${name}`] = "imported var";
			if(!parser.state.harmonySpecifier) parser.state.harmonySpecifier = {};
			parser.state.harmonySpecifier[`$${name}`] = [parser.state.lastHarmonyImport, HarmonyModulesHelpers.getModuleVar(parser.state, source), id];
			return true;
		});
		parser.plugin("expression imported var", (expr) => {
			const name = expr.name;
			const settings = parser.state.harmonySpecifier[`$${name}`];
			const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], settings[2], name, expr.range, this.strictExportPresence);
			dep.shorthand = parser.scope.inShorthand;
			dep.directImport = true;
			dep.loc = expr.loc;
			parser.state.current.addDependency(dep);
			return true;
		});
		parser.plugin("expression imported var.*", (expr) => {
			const name = expr.object.name;
			const settings = parser.state.harmonySpecifier[`$${name}`];
			if(settings[2] !== null)
				return false;
			const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], expr.property.name || expr.property.value, name, expr.range, this.strictExportPresence);
			dep.shorthand = parser.scope.inShorthand;
			dep.directImport = false;
			dep.loc = expr.loc;
			parser.state.current.addDependency(dep);
			return true;
		});
		if(this.strictThisContextOnImports) {
			// only in case when we strictly follow the spec we need a special case here
			parser.plugin("call imported var.*", (expr) => {
				const name = expr.callee.object.name;
				const settings = parser.state.harmonySpecifier[`$${name}`];
				if(settings[2] !== null)
					return false;
				const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], expr.callee.property.name || expr.callee.property.value, name, expr.callee.range, this.strictExportPresence);
				dep.shorthand = parser.scope.inShorthand;
				dep.directImport = false;
				dep.namespaceObjectAsContext = true;
				dep.loc = expr.callee.loc;
				parser.state.current.addDependency(dep);
				return true;
			});
			parser.plugin("call imported var", (expr) => {
				const args = expr.arguments;
				const fullExpr = expr;
				expr = expr.callee;
				const name = expr.name;
				const settings = parser.state.harmonySpecifier[`$${name}`];
				const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], settings[2], name, expr.range, this.strictExportPresence);
				dep.directImport = true;
				dep.callArgs = args;
				dep.call = fullExpr;
				dep.loc = expr.loc;
				parser.state.current.addDependency(dep);
				if(args)
					parser.walkExpressions(args);
				return true;
			});
		}
		parser.plugin("hot accept callback", (expr, requests) => {
			const dependencies = requests
				.filter(request => HarmonyModulesHelpers.checkModuleVar(parser.state, request))
				.map(request => {
					const dep = new HarmonyAcceptImportDependency(request, HarmonyModulesHelpers.getModuleVar(parser.state, request), expr.range);
					dep.loc = expr.loc;
					parser.state.current.addDependency(dep);
					return dep;
				});
			if(dependencies.length > 0) {
				const dep = new HarmonyAcceptDependency(expr.range, dependencies, true);
				dep.loc = expr.loc;
				parser.state.current.addDependency(dep);
			}
		});
		parser.plugin("hot accept without callback", (expr, requests) => {
			const dependencies = requests
				.filter(request => HarmonyModulesHelpers.checkModuleVar(parser.state, request))
				.map(request => {
					const dep = new HarmonyAcceptImportDependency(request, HarmonyModulesHelpers.getModuleVar(parser.state, request), expr.range);
					dep.loc = expr.loc;
					parser.state.current.addDependency(dep);
					return dep;
				});
			if(dependencies.length > 0) {
				const dep = new HarmonyAcceptDependency(expr.range, dependencies, false);
				dep.loc = expr.loc;
				parser.state.current.addDependency(dep);
			}
		});
	}
};
