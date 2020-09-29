/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InnerGraph = require("../optimize/InnerGraph");
const ConstDependency = require("./ConstDependency");
const HarmonyExportExpressionDependency = require("./HarmonyExportExpressionDependency");
const HarmonyExportHeaderDependency = require("./HarmonyExportHeaderDependency");
const HarmonyExportImportedSpecifierDependency = require("./HarmonyExportImportedSpecifierDependency");
const HarmonyExportSpecifierDependency = require("./HarmonyExportSpecifierDependency");
const {
	harmonySpecifierTag
} = require("./HarmonyImportDependencyParserPlugin");
const HarmonyImportSideEffectDependency = require("./HarmonyImportSideEffectDependency");

module.exports = class HarmonyExportDependencyParserPlugin {
	constructor(options) {
		const { module: moduleOptions } = options;
		this.strictExportPresence = moduleOptions.strictExportPresence;
	}

	apply(parser) {
		parser.hooks.export.tap(
			"HarmonyExportDependencyParserPlugin",
			statement => {
				const dep = new HarmonyExportHeaderDependency(
					statement.declaration && statement.declaration.range,
					statement.range
				);
				dep.loc = Object.create(statement.loc);
				dep.loc.index = -1;
				parser.state.module.addPresentationalDependency(dep);
				return true;
			}
		);
		parser.hooks.exportImport.tap(
			"HarmonyExportDependencyParserPlugin",
			(statement, source) => {
				parser.state.lastHarmonyImportOrder =
					(parser.state.lastHarmonyImportOrder || 0) + 1;
				const clearDep = new ConstDependency("", statement.range);
				clearDep.loc = Object.create(statement.loc);
				clearDep.loc.index = -1;
				parser.state.module.addPresentationalDependency(clearDep);
				const sideEffectDep = new HarmonyImportSideEffectDependency(
					source,
					parser.state.lastHarmonyImportOrder
				);
				sideEffectDep.loc = Object.create(statement.loc);
				sideEffectDep.loc.index = -1;
				parser.state.current.addDependency(sideEffectDep);
				return true;
			}
		);
		parser.hooks.exportExpression.tap(
			"HarmonyExportDependencyParserPlugin",
			(statement, expr) => {
				const isFunctionDeclaration = expr.type === "FunctionDeclaration";
				const comments = parser.getComments([
					statement.range[0],
					expr.range[0]
				]);
				const dep = new HarmonyExportExpressionDependency(
					expr.range,
					statement.range,
					comments
						.map(c => {
							switch (c.type) {
								case "Block":
									return `/*${c.value}*/`;
								case "Line":
									return `//${c.value}\n`;
							}
							return "";
						})
						.join(""),
					expr.type.endsWith("Declaration") && expr.id
						? expr.id.name
						: isFunctionDeclaration
						? {
								id: expr.id ? expr.id.name : undefined,
								range: [
									expr.range[0],
									expr.params.length > 0
										? expr.params[0].range[0]
										: expr.body.range[0]
								],
								prefix: `${expr.async ? "async " : ""}function${
									expr.generator ? "*" : ""
								} `,
								suffix: `(${expr.params.length > 0 ? "" : ") "}`
						  }
						: undefined
				);
				dep.loc = Object.create(statement.loc);
				dep.loc.index = -1;
				parser.state.current.addDependency(dep);
				InnerGraph.addVariableUsage(
					parser,
					expr.type.endsWith("Declaration") && expr.id
						? expr.id.name
						: "*default*",
					"default"
				);
				return true;
			}
		);
		parser.hooks.exportSpecifier.tap(
			"HarmonyExportDependencyParserPlugin",
			(statement, id, name, idx) => {
				const settings = parser.getTagData(id, harmonySpecifierTag);
				let dep;
				const harmonyNamedExports = (parser.state.harmonyNamedExports =
					parser.state.harmonyNamedExports || new Set());
				harmonyNamedExports.add(name);
				InnerGraph.addVariableUsage(parser, id, name);
				if (settings) {
					dep = new HarmonyExportImportedSpecifierDependency(
						settings.source,
						settings.sourceOrder,
						settings.ids,
						name,
						harmonyNamedExports,
						null,
						this.strictExportPresence
					);
				} else {
					dep = new HarmonyExportSpecifierDependency(id, name);
				}
				dep.loc = Object.create(statement.loc);
				dep.loc.index = idx;
				parser.state.current.addDependency(dep);
				return true;
			}
		);
		parser.hooks.exportImportSpecifier.tap(
			"HarmonyExportDependencyParserPlugin",
			(statement, source, id, name, idx) => {
				const harmonyNamedExports = (parser.state.harmonyNamedExports =
					parser.state.harmonyNamedExports || new Set());
				let harmonyStarExports = null;
				if (name) {
					harmonyNamedExports.add(name);
				} else {
					harmonyStarExports = parser.state.harmonyStarExports =
						parser.state.harmonyStarExports || [];
				}
				const dep = new HarmonyExportImportedSpecifierDependency(
					source,
					parser.state.lastHarmonyImportOrder,
					id ? [id] : [],
					name,
					harmonyNamedExports,
					harmonyStarExports && harmonyStarExports.slice(),
					this.strictExportPresence
				);
				if (harmonyStarExports) {
					harmonyStarExports.push(dep);
				}
				dep.loc = Object.create(statement.loc);
				dep.loc.index = idx;
				parser.state.current.addDependency(dep);
				return true;
			}
		);
	}
};
