/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("../WebpackError");
const InnerGraph = require("../optimize/InnerGraph");
const ConstDependency = require("./ConstDependency");
const HarmonyExportExpressionDependency = require("./HarmonyExportExpressionDependency");
const HarmonyExportHeaderDependency = require("./HarmonyExportHeaderDependency");
const HarmonyExportImportedSpecifierDependency = require("./HarmonyExportImportedSpecifierDependency");
const HarmonyExportSpecifierDependency = require("./HarmonyExportSpecifierDependency");
const { ExportPresenceModes } = require("./HarmonyImportDependency");
const {
	harmonySpecifierTag,
	getAssertions,
	getImportAttributes
} = require("./HarmonyImportDependencyParserPlugin");
const HarmonyImportSideEffectDependency = require("./HarmonyImportSideEffectDependency");

/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */

const { HarmonyStarExportsList } = HarmonyExportImportedSpecifierDependency;

module.exports = class HarmonyExportDependencyParserPlugin {
	/**
	 * @param {import("../../declarations/WebpackOptions").JavascriptParserOptions} options options
	 * @param {boolean} deferImport defer import enabled
	 */
	constructor(options, deferImport) {
		this.exportPresenceMode =
			options.reexportExportsPresence !== undefined
				? ExportPresenceModes.fromUserOption(options.reexportExportsPresence)
				: options.exportsPresence !== undefined
				? ExportPresenceModes.fromUserOption(options.exportsPresence)
				: options.strictExportPresence
				? ExportPresenceModes.ERROR
				: ExportPresenceModes.AUTO;
		this.deferImport = deferImport;
	}

	/**
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		const { exportPresenceMode } = this;
		parser.hooks.export.tap(
			"HarmonyExportDependencyParserPlugin",
			statement => {
				const dep = new HarmonyExportHeaderDependency(
					"declaration" in statement &&
						statement.declaration &&
						statement.declaration.range,
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
				const { defer, sync } = getImportAttributes(
					parser,
					statement,
					this.deferImport
				);
				if (defer && statement.type !== "ExportAllDeclaration") {
					const error = new WebpackError(
						"Deferred import can only be used with `export * as namespace from '...'` syntax."
					);
					error.loc = statement.loc;
					parser.state.current.addError(error);
				}
				const sideEffectDep = new HarmonyImportSideEffectDependency(
					String(source),
					parser.state.lastHarmonyImportOrder,
					getAssertions(statement),
					defer,
					sync
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
					expr.type.endsWith("Declaration") && "id" in expr && expr.id
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
					expr.type.endsWith("Declaration") && "id" in expr && expr.id
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
				/** @type {import("./HarmonyImportDependencyParserPlugin").HarmonySettings} */
				const settings = parser.getTagData(id, harmonySpecifierTag);
				let dep;
				const harmonyNamedExports = (parser.state.harmonyNamedExports =
					parser.state.harmonyNamedExports || new Set());
				harmonyNamedExports.add(name);
				InnerGraph.addVariableUsage(parser, id, name);
				if (settings) {
					if (settings.defer) {
						const error = new WebpackError(
							"Deferred import can only be used with `import * as namespace from '...'` syntax."
						);
						error.loc = statement.loc;
						parser.state.current.addError(error);
					}
					dep = new HarmonyExportImportedSpecifierDependency(
						settings.source,
						settings.sourceOrder,
						settings.ids,
						name,
						harmonyNamedExports,
						null,
						exportPresenceMode,
						null,
						settings.assertions,
						settings.defer,
						settings.syncAssert
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
						parser.state.harmonyStarExports || new HarmonyStarExportsList();
				}
				const { defer, sync } = getImportAttributes(
					parser,
					statement,
					this.deferImport
				);
				const dep = new HarmonyExportImportedSpecifierDependency(
					String(source),
					parser.state.lastHarmonyImportOrder,
					id ? [id] : [],
					name,
					harmonyNamedExports,
					harmonyStarExports && harmonyStarExports.slice(),
					exportPresenceMode,
					harmonyStarExports,
					getAssertions(statement),
					defer,
					sync
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
