/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const HarmonyExportExpressionDependency = require("./HarmonyExportExpressionDependency");
const HarmonyImportSideEffectDependency = require("./HarmonyImportSideEffectDependency");
const HarmonyExportHeaderDependency = require("./HarmonyExportHeaderDependency");
const HarmonyExportSpecifierDependency = require("./HarmonyExportSpecifierDependency");
const HarmonyExportImportedSpecifierDependency = require("./HarmonyExportImportedSpecifierDependency");
const ConstDependency = require("./ConstDependency");

module.exports = class HarmonyExportDependencyParserPlugin {
	apply(parser) {
		parser.plugin("export", statement => {
			const dep = new HarmonyExportHeaderDependency(statement.declaration && statement.declaration.range, statement.range);
			dep.loc = Object.create(statement.loc);
			dep.loc.index = -1;
			parser.state.current.addDependency(dep);
			return true;
		});
		parser.plugin("export import", (statement, source) => {
			parser.state.lastHarmonyImportOrder = (parser.state.lastHarmonyImportOrder || 0) + 1;
			const clearDep = new ConstDependency("", statement.range);
			clearDep.loc = Object.create(statement.loc);
			clearDep.loc.index = -1;
			parser.state.current.addDependency(clearDep);
			const sideEffectDep = new HarmonyImportSideEffectDependency(source, parser.state.module, parser.state.lastHarmonyImportOrder, parser.state.harmonyParserScope);
			sideEffectDep.loc = Object.create(statement.loc);
			sideEffectDep.loc.index = -1;
			parser.state.current.addDependency(sideEffectDep);
			return true;
		});
		parser.plugin("export expression", (statement, expr) => {
			const dep = new HarmonyExportExpressionDependency(parser.state.module, expr.range, statement.range);
			dep.loc = Object.create(statement.loc);
			dep.loc.index = -1;
			parser.state.current.addDependency(dep);
			return true;
		});
		parser.plugin("export declaration", statement => {});
		parser.plugin("export specifier", (statement, id, name, idx) => {
			const rename = parser.scope.renames[`$${id}`];
			let dep;
			if(rename === "imported var") {
				const settings = parser.state.harmonySpecifier.get(id);
				dep = new HarmonyExportImportedSpecifierDependency(settings.source, parser.state.module, settings.sourceOrder, parser.state.harmonyParserScope, settings.id, name);
			} else {
				dep = new HarmonyExportSpecifierDependency(parser.state.module, id, name);
			}
			dep.loc = Object.create(statement.loc);
			dep.loc.index = idx;
			parser.state.current.addDependency(dep);
			return true;
		});
		parser.plugin("export import specifier", (statement, source, id, name, idx) => {
			const dep = new HarmonyExportImportedSpecifierDependency(source, parser.state.module, parser.state.lastHarmonyImportOrder, parser.state.harmonyParserScope, id, name);
			dep.loc = Object.create(statement.loc);
			dep.loc.index = idx;
			parser.state.current.addDependency(dep);
			return true;
		});
	}
};
