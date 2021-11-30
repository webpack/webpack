/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HotModuleReplacementPlugin = require("../HotModuleReplacementPlugin");
const InnerGraph = require("../optimize/InnerGraph");
const ConstDependency = require("./ConstDependency");
const HarmonyAcceptDependency = require("./HarmonyAcceptDependency");
const HarmonyAcceptImportDependency = require("./HarmonyAcceptImportDependency");
const HarmonyExports = require("./HarmonyExports");
const { ExportPresenceModes } = require("./HarmonyImportDependency");
const HarmonyImportSideEffectDependency = require("./HarmonyImportSideEffectDependency");
const HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");

/** @typedef {import("estree").ExportAllDeclaration} ExportAllDeclaration */
/** @typedef {import("estree").ExportNamedDeclaration} ExportNamedDeclaration */
/** @typedef {import("estree").Identifier} Identifier */
/** @typedef {import("estree").ImportDeclaration} ImportDeclaration */
/** @typedef {import("estree").ImportExpression} ImportExpression */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../optimize/InnerGraph").InnerGraph} InnerGraph */
/** @typedef {import("../optimize/InnerGraph").TopLevelSymbol} TopLevelSymbol */
/** @typedef {import("./HarmonyImportDependency")} HarmonyImportDependency */

const harmonySpecifierTag = Symbol("harmony import");

/**
 * @typedef {Object} HarmonySettings
 * @property {string[]} ids
 * @property {string} source
 * @property {number} sourceOrder
 * @property {string} name
 * @property {boolean} await
 * @property {Record<string, any> | undefined} assertions
 */

/**
 * @param {ImportDeclaration | ExportNamedDeclaration | ExportAllDeclaration | ImportExpression} node node with assertions
 * @returns {Record<string, any> | undefined} assertions
 */
function getAssertions(node) {
	// TODO remove cast when @types/estree has been updated to import assertions
	const assertions = /** @type {{ assertions?: ImportAttributeNode[] }} */ (
		node
	).assertions;
	if (assertions === undefined) {
		return undefined;
	}
	const result = {};
	for (const assertion of assertions) {
		const key =
			assertion.key.type === "Identifier"
				? assertion.key.name
				: assertion.key.value;
		result[key] = assertion.value.value;
	}
	return result;
}

module.exports = class HarmonyImportDependencyParserPlugin {
	/**
	 * @param {JavascriptParserOptions} options options
	 */
	constructor(options) {
		this.exportPresenceMode =
			options.importExportsPresence !== undefined
				? ExportPresenceModes.fromUserOption(options.importExportsPresence)
				: options.exportsPresence !== undefined
				? ExportPresenceModes.fromUserOption(options.exportsPresence)
				: options.strictExportPresence
				? ExportPresenceModes.ERROR
				: ExportPresenceModes.AUTO;
		this.strictThisContextOnImports = options.strictThisContextOnImports;
	}

	/**
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		const { exportPresenceMode } = this;
		parser.hooks.isPure
			.for("Identifier")
			.tap("HarmonyImportDependencyParserPlugin", expression => {
				const expr = /** @type {Identifier} */ (expression);
				if (
					parser.isVariableDefined(expr.name) ||
					parser.getTagData(expr.name, harmonySpecifierTag)
				) {
					return true;
				}
			});
		parser.hooks.import.tap(
			"HarmonyImportDependencyParserPlugin",
			(statement, source) => {
				parser.state.lastHarmonyImportOrder =
					(parser.state.lastHarmonyImportOrder || 0) + 1;
				const clearDep = new ConstDependency(
					parser.isAsiPosition(statement.range[0]) ? ";" : "",
					statement.range
				);
				clearDep.loc = statement.loc;
				parser.state.module.addPresentationalDependency(clearDep);
				parser.unsetAsiPosition(statement.range[1]);
				const assertions = getAssertions(statement);
				const sideEffectDep = new HarmonyImportSideEffectDependency(
					source,
					parser.state.lastHarmonyImportOrder,
					assertions
				);
				sideEffectDep.loc = statement.loc;
				parser.state.module.addDependency(sideEffectDep);
				return true;
			}
		);
		parser.hooks.importSpecifier.tap(
			"HarmonyImportDependencyParserPlugin",
			(statement, source, id, name) => {
				const ids = id === null ? [] : [id];
				parser.tagVariable(name, harmonySpecifierTag, {
					name,
					source,
					ids,
					sourceOrder: parser.state.lastHarmonyImportOrder,
					assertions: getAssertions(statement)
				});
				return true;
			}
		);
		parser.hooks.expression
			.for(harmonySpecifierTag)
			.tap("HarmonyImportDependencyParserPlugin", expr => {
				const settings = /** @type {HarmonySettings} */ (parser.currentTagData);
				const dep = new HarmonyImportSpecifierDependency(
					settings.source,
					settings.sourceOrder,
					settings.ids,
					settings.name,
					expr.range,
					exportPresenceMode,
					settings.assertions
				);
				dep.shorthand = parser.scope.inShorthand;
				dep.directImport = true;
				dep.asiSafe = !parser.isAsiPosition(expr.range[0]);
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);
				InnerGraph.onUsage(parser.state, e => (dep.usedByExports = e));
				return true;
			});
		parser.hooks.expressionMemberChain
			.for(harmonySpecifierTag)
			.tap("HarmonyImportDependencyParserPlugin", (expr, members) => {
				const settings = /** @type {HarmonySettings} */ (parser.currentTagData);
				const ids = settings.ids.concat(members);
				const dep = new HarmonyImportSpecifierDependency(
					settings.source,
					settings.sourceOrder,
					ids,
					settings.name,
					expr.range,
					exportPresenceMode,
					settings.assertions
				);
				dep.asiSafe = !parser.isAsiPosition(expr.range[0]);
				dep.loc = expr.loc;
				parser.state.module.addDependency(dep);
				InnerGraph.onUsage(parser.state, e => (dep.usedByExports = e));
				return true;
			});
		parser.hooks.callMemberChain
			.for(harmonySpecifierTag)
			.tap("HarmonyImportDependencyParserPlugin", (expr, members) => {
				const { arguments: args, callee } = expr;
				const settings = /** @type {HarmonySettings} */ (parser.currentTagData);
				const ids = settings.ids.concat(members);
				const dep = new HarmonyImportSpecifierDependency(
					settings.source,
					settings.sourceOrder,
					ids,
					settings.name,
					callee.range,
					exportPresenceMode,
					settings.assertions
				);
				dep.directImport = members.length === 0;
				dep.call = true;
				dep.asiSafe = !parser.isAsiPosition(callee.range[0]);
				// only in case when we strictly follow the spec we need a special case here
				dep.namespaceObjectAsContext =
					members.length > 0 && this.strictThisContextOnImports;
				dep.loc = callee.loc;
				parser.state.module.addDependency(dep);
				if (args) parser.walkExpressions(args);
				InnerGraph.onUsage(parser.state, e => (dep.usedByExports = e));
				return true;
			});
		const { hotAcceptCallback, hotAcceptWithoutCallback } =
			HotModuleReplacementPlugin.getParserHooks(parser);
		hotAcceptCallback.tap(
			"HarmonyImportDependencyParserPlugin",
			(expr, requests) => {
				if (!HarmonyExports.isEnabled(parser.state)) {
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
				if (!HarmonyExports.isEnabled(parser.state)) {
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

module.exports.harmonySpecifierTag = harmonySpecifierTag;
module.exports.getAssertions = getAssertions;
