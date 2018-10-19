/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HotModuleReplacementPlugin = require("../HotModuleReplacementPlugin");
const ConstDependency = require("./ConstDependency");
const HarmonyAcceptDependency = require("./HarmonyAcceptDependency");
const HarmonyAcceptImportDependency = require("./HarmonyAcceptImportDependency");
const HarmonyImportSideEffectDependency = require("./HarmonyImportSideEffectDependency");
const HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");

module.exports = class HarmonyImportDependencyParserPlugin {
	constructor(moduleOptions) {
		this.strictExportPresence = moduleOptions.strictExportPresence;
		this.strictThisContextOnImports = moduleOptions.strictThisContextOnImports;
	}

	apply(parser) {
		parser.hooks.import.tap(
			"HarmonyImportDependencyParserPlugin",
			(statement, source) => {
				parser.state.lastHarmonyImportOrder =
					(parser.state.lastHarmonyImportOrder || 0) + 1;
				const clearDep = new ConstDependency("", statement.range);
				clearDep.loc = statement.loc;
				parser.state.module.addDependency(clearDep);
				const sideEffectDep = new HarmonyImportSideEffectDependency(
					source,
					parser.state.lastHarmonyImportOrder
				);
				sideEffectDep.loc = statement.loc;
				parser.state.module.addDependency(sideEffectDep);
				return true;
			}
		);
		parser.hooks.importSpecifier.tap(
			"HarmonyImportDependencyParserPlugin",
			(statement, source, id, name) => {
				parser.scope.definitions.delete(name);
				parser.scope.renames.set(name, "imported var");
				if (!parser.state.harmonySpecifier) {
					parser.state.harmonySpecifier = new Map();
				}
				parser.state.harmonySpecifier.set(name, {
					source,
					id,
					sourceOrder: parser.state.lastHarmonyImportOrder
				});
				return true;
			}
		);
		parser.hooks.expression
			.for("imported var")
			.tap("HarmonyImportDependencyParserPlugin", expr => {
				const name = expr.name;
				const settings = parser.state.harmonySpecifier.get(name);
				const dep = new HarmonyImportSpecifierDependency(
					settings.source,
					settings.sourceOrder,
					settings.id,
					name,
					expr.range,
					this.strictExportPresence
				);
				dep.shorthand = parser.scope.inShorthand;
				dep.directImport = true;
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);
				return true;
			});
		parser.hooks.expressionAnyMember
			.for("imported var")
			.tap("HarmonyImportDependencyParserPlugin", expr => {
				const name = expr.object.name;
				const settings = parser.state.harmonySpecifier.get(name);
				if (settings.id !== null) return false;
				const dep = new HarmonyImportSpecifierDependency(
					settings.source,
					settings.sourceOrder,
					expr.property.name || expr.property.value,
					name,
					expr.range,
					this.strictExportPresence
				);
				dep.shorthand = parser.scope.inShorthand;
				dep.directImport = false;
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);
				return true;
			});
		if (this.strictThisContextOnImports) {
			// only in case when we strictly follow the spec we need a special case here
			parser.hooks.callAnyMember
				.for("imported var")
				.tap("HarmonyImportDependencyParserPlugin", expr => {
					if (expr.callee.type !== "MemberExpression") return;
					if (expr.callee.object.type !== "Identifier") return;
					const name = expr.callee.object.name;
					const settings = parser.state.harmonySpecifier.get(name);
					if (settings.id !== null) return false;
					const dep = new HarmonyImportSpecifierDependency(
						settings.source,
						settings.sourceOrder,
						expr.callee.property.name || expr.callee.property.value,
						name,
						expr.callee.range,
						this.strictExportPresence
					);
					dep.shorthand = parser.scope.inShorthand;
					dep.directImport = false;
					dep.namespaceObjectAsContext = true;
					dep.loc = expr.callee.loc;
					parser.state.module.addDependency(dep);
					if (expr.arguments) parser.walkExpressions(expr.arguments);
					return true;
				});
		}
		parser.hooks.call
			.for("imported var")
			.tap("HarmonyImportDependencyParserPlugin", expr => {
				const args = expr.arguments;
				expr = expr.callee;
				if (expr.type !== "Identifier") return;
				const name = expr.name;
				const settings = parser.state.harmonySpecifier.get(name);
				const dep = new HarmonyImportSpecifierDependency(
					settings.source,
					settings.sourceOrder,
					settings.id,
					name,
					expr.range,
					this.strictExportPresence
				);
				dep.directImport = true;
				dep.call = true;
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);
				if (args) parser.walkExpressions(args);
				return true;
			});
		const {
			hotAcceptCallback,
			hotAcceptWithoutCallback
		} = HotModuleReplacementPlugin.getParserHooks(parser);
		hotAcceptCallback.tap(
			"HarmonyImportDependencyParserPlugin",
			(expr, requests) => {
				if (!parser.state.harmonyModule) {
					// This is not a harmony module, skip it
					return;
				}
				const dependencies = requests.map(request => {
					const dep = new HarmonyAcceptImportDependency(request);
					dep.loc = expr.loc;
					parser.state.module.addDependency(dep);
					return dep;
				});
				if (dependencies.length > 0) {
					const dep = new HarmonyAcceptDependency(
						expr.range,
						dependencies,
						true
					);
					dep.loc = expr.loc;
					parser.state.module.addDependency(dep);
				}
			}
		);
		hotAcceptWithoutCallback.tap(
			"HarmonyImportDependencyParserPlugin",
			(expr, requests) => {
				if (!parser.state.harmonyModule) {
					// This is not a harmony module, skip it
					return;
				}
				const dependencies = requests.map(request => {
					const dep = new HarmonyAcceptImportDependency(request);
					dep.loc = expr.loc;
					parser.state.module.addDependency(dep);
					return dep;
				});
				if (dependencies.length > 0) {
					const dep = new HarmonyAcceptDependency(
						expr.range,
						dependencies,
						false
					);
					dep.loc = expr.loc;
					parser.state.module.addDependency(dep);
				}
			}
		);
	}
};
