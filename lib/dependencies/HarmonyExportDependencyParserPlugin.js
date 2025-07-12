/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("../WebpackError");
const { getImportAttributes } = require("../javascript/JavascriptParser");
const InnerGraph = require("../optimize/InnerGraph");
const ConstDependency = require("./ConstDependency");
const HarmonyExportExpressionDependency = require("./HarmonyExportExpressionDependency");
const HarmonyExportHeaderDependency = require("./HarmonyExportHeaderDependency");
const HarmonyExportImportedSpecifierDependency = require("./HarmonyExportImportedSpecifierDependency");
const HarmonyExportSpecifierDependency = require("./HarmonyExportSpecifierDependency");
const { ExportPresenceModes } = require("./HarmonyImportDependency");
const {
	getImportMode,
	harmonySpecifierTag
} = require("./HarmonyImportDependencyParserPlugin");
const HarmonyImportSideEffectDependency = require("./HarmonyImportSideEffectDependency");

/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser").ClassDeclaration} ClassDeclaration */
/** @typedef {import("../javascript/JavascriptParser").FunctionDeclaration} FunctionDeclaration */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */

const { HarmonyStarExportsList } = HarmonyExportImportedSpecifierDependency;

const PLUGIN_NAME = "HarmonyExportDependencyParserPlugin";

module.exports = class HarmonyExportDependencyParserPlugin {
	/**
	 * @param {import("../../declarations/WebpackOptions").JavascriptParserOptions} options options
	 * @param {boolean=} deferImport defer import enabled
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
		parser.hooks.export.tap(PLUGIN_NAME, statement => {
			const dep = new HarmonyExportHeaderDependency(
				/** @type {Range | false} */ (
					statement.declaration && statement.declaration.range
				),
				/** @type {Range} */ (statement.range)
			);
			dep.loc = Object.create(
				/** @type {DependencyLocation} */ (statement.loc)
			);
			dep.loc.index = -1;
			parser.state.module.addPresentationalDependency(dep);
			return true;
		});
		parser.hooks.exportImport.tap(PLUGIN_NAME, (statement, source) => {
			parser.state.lastHarmonyImportOrder =
				(parser.state.lastHarmonyImportOrder || 0) + 1;
			const clearDep = new ConstDependency(
				"",
				/** @type {Range} */ (statement.range)
			);
			clearDep.loc = /** @type {DependencyLocation} */ (statement.loc);
			clearDep.loc.index = -1;
			parser.state.module.addPresentationalDependency(clearDep);
			const { defer } = getImportMode(parser, statement);
			if (defer) {
				const error = new WebpackError(
					"Deferred re-export (`export defer * as namespace from '...'`) is not a part of the Import Defer proposal.\nUse the following code instead:\n    import defer * as namespace from '...';\n    export { namespace };"
				);
				error.loc = statement.loc || undefined;
				parser.state.current.addError(error);
			}
			const sideEffectDep = new HarmonyImportSideEffectDependency(
				/** @type {string} */ (source),
				parser.state.lastHarmonyImportOrder,
				getImportAttributes(statement),
				defer
			);
			sideEffectDep.loc = Object.create(
				/** @type {DependencyLocation} */ (statement.loc)
			);
			sideEffectDep.loc.index = -1;
			parser.state.current.addDependency(sideEffectDep);
			return true;
		});
		parser.hooks.exportExpression.tap(PLUGIN_NAME, (statement, node) => {
			const isFunctionDeclaration = node.type === "FunctionDeclaration";
			const exprRange = /** @type {Range} */ (node.range);
			const statementRange = /** @type {Range} */ (statement.range);
			const comments = parser.getComments([statementRange[0], exprRange[0]]);
			const dep = new HarmonyExportExpressionDependency(
				exprRange,
				statementRange,
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
				node.type.endsWith("Declaration") &&
				/** @type {FunctionDeclaration | ClassDeclaration} */ (node).id
					? /** @type {FunctionDeclaration | ClassDeclaration} */
						(node).id.name
					: isFunctionDeclaration
						? {
								range: [
									exprRange[0],
									node.params.length > 0
										? /** @type {Range} */ (node.params[0].range)[0]
										: /** @type {Range} */ (node.body.range)[0]
								],
								prefix: `${node.async ? "async " : ""}function${
									node.generator ? "*" : ""
								} `,
								suffix: `(${node.params.length > 0 ? "" : ") "}`
							}
						: undefined
			);
			dep.loc = Object.create(
				/** @type {DependencyLocation} */ (statement.loc)
			);
			dep.loc.index = -1;
			parser.state.current.addDependency(dep);
			InnerGraph.addVariableUsage(
				parser,
				node.type.endsWith("Declaration") &&
					/** @type {FunctionDeclaration | ClassDeclaration} */ (node).id
					? /** @type {FunctionDeclaration | ClassDeclaration} */ (node).id.name
					: "*default*",
				"default"
			);
			return true;
		});
		parser.hooks.exportSpecifier.tap(
			PLUGIN_NAME,
			(statement, id, name, idx) => {
				const settings = parser.getTagData(id, harmonySpecifierTag);
				const harmonyNamedExports = (parser.state.harmonyNamedExports =
					parser.state.harmonyNamedExports || new Set());
				harmonyNamedExports.add(name);
				InnerGraph.addVariableUsage(parser, id, name);
				const dep = settings
					? new HarmonyExportImportedSpecifierDependency(
							settings.source,
							settings.sourceOrder,
							settings.ids,
							name,
							harmonyNamedExports,
							null,
							exportPresenceMode,
							null,
							settings.attributes,
							settings.defer
						)
					: new HarmonyExportSpecifierDependency(id, name);
				dep.loc = Object.create(
					/** @type {DependencyLocation} */ (statement.loc)
				);
				dep.loc.index = idx;
				const isAsiSafe = !parser.isAsiPosition(
					/** @type {Range} */
					(statement.range)[0]
				);
				if (!isAsiSafe) {
					parser.setAsiPosition(/** @type {Range} */ (statement.range)[1]);
				}
				parser.state.current.addDependency(dep);
				return true;
			}
		);
		parser.hooks.exportImportSpecifier.tap(
			PLUGIN_NAME,
			(statement, source, id, name, idx) => {
				const harmonyNamedExports = (parser.state.harmonyNamedExports =
					parser.state.harmonyNamedExports || new Set());
				/** @type {InstanceType<HarmonyStarExportsList> | null} */
				let harmonyStarExports = null;
				if (name) {
					harmonyNamedExports.add(name);
				} else {
					harmonyStarExports = parser.state.harmonyStarExports =
						parser.state.harmonyStarExports || new HarmonyStarExportsList();
				}
				const attributes = getImportAttributes(statement);
				const { defer } = getImportMode(parser, statement);
				const dep = new HarmonyExportImportedSpecifierDependency(
					/** @type {string} */
					(source),
					parser.state.lastHarmonyImportOrder,
					id ? [id] : [],
					name,
					harmonyNamedExports,
					// eslint-disable-next-line unicorn/prefer-spread
					harmonyStarExports && harmonyStarExports.slice(),
					exportPresenceMode,
					harmonyStarExports,
					attributes,
					defer
				);
				if (harmonyStarExports) {
					harmonyStarExports.push(dep);
				}
				dep.loc = Object.create(
					/** @type {DependencyLocation} */ (statement.loc)
				);
				dep.loc.index = idx;
				const isAsiSafe = !parser.isAsiPosition(
					/** @type {Range} */
					(statement.range)[0]
				);
				if (!isAsiSafe) {
					parser.setAsiPosition(/** @type {Range} */ (statement.range)[1]);
				}
				parser.state.current.addDependency(dep);
				return true;
			}
		);
	}
};
