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
const HarmonyImportSideEffectDependency = require("./HarmonyImportSideEffectDependency");
const HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");

/** @typedef {import("estree").Identifier} Identifier */
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
 */

module.exports = class HarmonyImportDependencyParserPlugin {
	constructor(options) {
		this.strictExportPresence = options.strictExportPresence;
		this.strictThisContextOnImports = options.strictThisContextOnImports;
	}

	/**
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
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
				const ids = id === null ? [] : [id];
				parser.tagVariable(name, harmonySpecifierTag, {
					name,
					source,
					ids,
					sourceOrder: parser.state.lastHarmonyImportOrder
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
					this.strictExportPresence
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
					this.strictExportPresence
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
					this.strictExportPresence
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
		const {
			hotAcceptCallback,
			hotAcceptWithoutCallback
		} = HotModuleReplacementPlugin.getParserHooks(parser);
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
