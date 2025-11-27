/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HotModuleReplacementPlugin = require("../HotModuleReplacementPlugin");
const WebpackError = require("../WebpackError");
const {
	VariableInfo,
	getImportAttributes
} = require("../javascript/JavascriptParser");
const InnerGraph = require("../optimize/InnerGraph");
const ConstDependency = require("./ConstDependency");
const HarmonyAcceptDependency = require("./HarmonyAcceptDependency");
const HarmonyAcceptImportDependency = require("./HarmonyAcceptImportDependency");
const HarmonyEvaluatedImportSpecifierDependency = require("./HarmonyEvaluatedImportSpecifierDependency");
const HarmonyExports = require("./HarmonyExports");
const { ExportPresenceModes } = require("./HarmonyImportDependency");
const HarmonyImportSideEffectDependency = require("./HarmonyImportSideEffectDependency");
const HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");
const { ImportPhaseUtils, createGetImportPhase } = require("./ImportPhase");

/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("estree").Identifier} Identifier */
/** @typedef {import("estree").MemberExpression} MemberExpression */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser").ExportAllDeclaration} ExportAllDeclaration */
/** @typedef {import("../javascript/JavascriptParser").ExportNamedDeclaration} ExportNamedDeclaration */
/** @typedef {import("../javascript/JavascriptParser").ImportAttributes} ImportAttributes */
/** @typedef {import("../javascript/JavascriptParser").ImportDeclaration} ImportDeclaration */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../javascript/JavascriptParser").Members} Members */
/** @typedef {import("../javascript/JavascriptParser").MembersOptionals} MembersOptionals */
/** @typedef {import("./HarmonyImportDependency").Ids} Ids */
/** @typedef {import("./ImportPhase").ImportPhaseType} ImportPhaseType */

const harmonySpecifierTag = Symbol("harmony import");

/**
 * @typedef {object} HarmonySettings
 * @property {Ids} ids
 * @property {string} source
 * @property {number} sourceOrder
 * @property {string} name
 * @property {boolean} await
 * @property {ImportAttributes=} attributes
 * @property {ImportPhaseType} phase
 */

const PLUGIN_NAME = "HarmonyImportDependencyParserPlugin";

module.exports = class HarmonyImportDependencyParserPlugin {
	/**
	 * @param {JavascriptParserOptions} options options
	 */
	constructor(options) {
		this.options = options;
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

		const getImportPhase = createGetImportPhase(this.options.deferImport);

		/**
		 * @param {Members} members members
		 * @param {MembersOptionals} membersOptionals members Optionals
		 * @returns {Ids} a non optional part
		 */
		function getNonOptionalPart(members, membersOptionals) {
			let i = 0;
			while (i < members.length && membersOptionals[i] === false) i++;
			return i !== members.length ? members.slice(0, i) : members;
		}

		/**
		 * @param {MemberExpression} node member expression
		 * @param {number} count count
		 * @returns {Expression} member expression
		 */
		function getNonOptionalMemberChain(node, count) {
			while (count--) node = /** @type {MemberExpression} */ (node.object);
			return node;
		}

		parser.hooks.isPure.for("Identifier").tap(PLUGIN_NAME, (expression) => {
			const expr = /** @type {Identifier} */ (expression);
			if (
				parser.isVariableDefined(expr.name) ||
				parser.getTagData(expr.name, harmonySpecifierTag)
			) {
				return true;
			}
		});
		parser.hooks.import.tap(PLUGIN_NAME, (statement, source) => {
			parser.state.lastHarmonyImportOrder =
				(parser.state.lastHarmonyImportOrder || 0) + 1;
			const clearDep = new ConstDependency(
				parser.isAsiPosition(/** @type {Range} */ (statement.range)[0])
					? ";"
					: "",
				/** @type {Range} */ (statement.range)
			);
			clearDep.loc = /** @type {DependencyLocation} */ (statement.loc);
			parser.state.module.addPresentationalDependency(clearDep);
			parser.unsetAsiPosition(/** @type {Range} */ (statement.range)[1]);
			const attributes = getImportAttributes(statement);
			const phase = getImportPhase(parser, statement);
			if (
				ImportPhaseUtils.isDefer(phase) &&
				(statement.specifiers.length !== 1 ||
					statement.specifiers[0].type !== "ImportNamespaceSpecifier")
			) {
				const error = new WebpackError(
					"Deferred import can only be used with `import * as namespace from '...'` syntax."
				);
				error.loc = statement.loc || undefined;
				parser.state.current.addError(error);
			}

			const sideEffectDep = new HarmonyImportSideEffectDependency(
				/** @type {string} */ (source),
				parser.state.lastHarmonyImportOrder,
				phase,
				attributes
			);
			sideEffectDep.loc = /** @type {DependencyLocation} */ (statement.loc);
			parser.state.module.addDependency(sideEffectDep);
			return true;
		});
		parser.hooks.importSpecifier.tap(
			PLUGIN_NAME,
			(statement, source, id, name) => {
				const ids = id === null ? [] : [id];
				const phase = getImportPhase(parser, statement);
				parser.tagVariable(
					name,
					harmonySpecifierTag,
					/** @type {HarmonySettings} */ ({
						name,
						source,
						ids,
						sourceOrder: parser.state.lastHarmonyImportOrder,
						attributes: getImportAttributes(statement),
						phase
					})
				);
				return true;
			}
		);
		parser.hooks.binaryExpression.tap(PLUGIN_NAME, (expression) => {
			if (expression.operator !== "in") return;

			const leftPartEvaluated = parser.evaluateExpression(expression.left);
			if (leftPartEvaluated.couldHaveSideEffects()) return;
			/** @type {string | undefined} */
			const leftPart = leftPartEvaluated.asString();
			if (!leftPart) return;

			const rightPart = parser.evaluateExpression(expression.right);
			if (!rightPart.isIdentifier()) return;

			const rootInfo = rightPart.rootInfo;
			if (
				typeof rootInfo === "string" ||
				!rootInfo ||
				!rootInfo.tagInfo ||
				rootInfo.tagInfo.tag !== harmonySpecifierTag
			) {
				return;
			}
			const settings =
				/** @type {HarmonySettings} */
				(rootInfo.tagInfo.data);
			const members =
				/** @type {(() => Members)} */
				(rightPart.getMembers)();
			const dep = new HarmonyEvaluatedImportSpecifierDependency(
				settings.source,
				settings.sourceOrder,
				[...settings.ids, ...members, leftPart],
				settings.name,
				/** @type {Range} */ (expression.range),
				settings.attributes,
				"in"
			);
			dep.directImport = members.length === 0;
			dep.asiSafe = !parser.isAsiPosition(
				/** @type {Range} */ (expression.range)[0]
			);
			dep.loc = /** @type {DependencyLocation} */ (expression.loc);
			parser.state.module.addDependency(dep);
			InnerGraph.onUsage(parser.state, (e) => (dep.usedByExports = e));
			return true;
		});
		parser.hooks.collectDestructuringAssignmentProperties.tap(
			PLUGIN_NAME,
			(expr) => {
				const nameInfo = parser.getNameForExpression(expr);
				if (
					nameInfo &&
					nameInfo.rootInfo instanceof VariableInfo &&
					nameInfo.rootInfo.name &&
					parser.getTagData(nameInfo.rootInfo.name, harmonySpecifierTag)
				) {
					return true;
				}
			}
		);
		parser.hooks.expression
			.for(harmonySpecifierTag)
			.tap(PLUGIN_NAME, (expr) => {
				const settings = /** @type {HarmonySettings} */ (parser.currentTagData);
				const dep = new HarmonyImportSpecifierDependency(
					settings.source,
					settings.sourceOrder,
					settings.ids,
					settings.name,
					/** @type {Range} */
					(expr.range),
					exportPresenceMode,
					settings.phase,
					settings.attributes,
					[]
				);
				dep.referencedPropertiesInDestructuring =
					parser.destructuringAssignmentPropertiesFor(expr);
				dep.shorthand = parser.scope.inShorthand;
				dep.directImport = true;
				dep.asiSafe = !parser.isAsiPosition(
					/** @type {Range} */ (expr.range)[0]
				);
				dep.loc = /** @type {DependencyLocation} */ (expr.loc);
				dep.call = parser.scope.inTaggedTemplateTag;
				parser.state.module.addDependency(dep);
				InnerGraph.onUsage(parser.state, (e) => (dep.usedByExports = e));
				return true;
			});
		parser.hooks.expressionMemberChain
			.for(harmonySpecifierTag)
			.tap(
				PLUGIN_NAME,
				(expression, members, membersOptionals, memberRanges) => {
					const settings =
						/** @type {HarmonySettings} */
						(parser.currentTagData);
					const nonOptionalMembers = getNonOptionalPart(
						members,
						membersOptionals
					);
					/** @type {Range[]} */
					const ranges = memberRanges.slice(
						0,
						memberRanges.length - (members.length - nonOptionalMembers.length)
					);
					const expr =
						nonOptionalMembers !== members
							? getNonOptionalMemberChain(
									expression,
									members.length - nonOptionalMembers.length
								)
							: expression;
					const ids = [...settings.ids, ...nonOptionalMembers];
					const dep = new HarmonyImportSpecifierDependency(
						settings.source,
						settings.sourceOrder,
						ids,
						settings.name,
						/** @type {Range} */
						(expr.range),
						exportPresenceMode,
						settings.phase,
						settings.attributes,
						ranges
					);
					dep.referencedPropertiesInDestructuring =
						parser.destructuringAssignmentPropertiesFor(expr);
					dep.asiSafe = !parser.isAsiPosition(
						/** @type {Range} */
						(expr.range)[0]
					);
					dep.loc = /** @type {DependencyLocation} */ (expr.loc);
					parser.state.module.addDependency(dep);
					InnerGraph.onUsage(parser.state, (e) => (dep.usedByExports = e));
					return true;
				}
			);
		parser.hooks.callMemberChain
			.for(harmonySpecifierTag)
			.tap(
				PLUGIN_NAME,
				(expression, members, membersOptionals, memberRanges) => {
					const { arguments: args } = expression;
					const callee = /** @type {MemberExpression} */ (expression.callee);
					const settings = /** @type {HarmonySettings} */ (
						parser.currentTagData
					);
					const nonOptionalMembers = getNonOptionalPart(
						members,
						membersOptionals
					);
					/** @type {Range[]} */
					const ranges = memberRanges.slice(
						0,
						memberRanges.length - (members.length - nonOptionalMembers.length)
					);
					const expr =
						nonOptionalMembers !== members
							? getNonOptionalMemberChain(
									callee,
									members.length - nonOptionalMembers.length
								)
							: callee;
					const ids = [...settings.ids, ...nonOptionalMembers];
					const dep = new HarmonyImportSpecifierDependency(
						settings.source,
						settings.sourceOrder,
						ids,
						settings.name,
						/** @type {Range} */ (expr.range),
						exportPresenceMode,
						settings.phase,
						settings.attributes,
						ranges
					);
					dep.directImport = members.length === 0;
					dep.call = true;
					dep.asiSafe = !parser.isAsiPosition(
						/** @type {Range} */ (expr.range)[0]
					);
					// only in case when we strictly follow the spec we need a special case here
					dep.namespaceObjectAsContext =
						members.length > 0 &&
						/** @type {boolean} */ (this.strictThisContextOnImports);
					dep.loc = /** @type {DependencyLocation} */ (expr.loc);
					parser.state.module.addDependency(dep);
					if (args) parser.walkExpressions(args);
					InnerGraph.onUsage(parser.state, (e) => (dep.usedByExports = e));
					return true;
				}
			);
		const { hotAcceptCallback, hotAcceptWithoutCallback } =
			HotModuleReplacementPlugin.getParserHooks(parser);
		hotAcceptCallback.tap(PLUGIN_NAME, (expr, requests) => {
			if (!HarmonyExports.isEnabled(parser.state)) {
				// This is not a harmony module, skip it
				return;
			}
			const dependencies = requests.map((request) => {
				const dep = new HarmonyAcceptImportDependency(request);
				dep.loc = /** @type {DependencyLocation} */ (expr.loc);
				parser.state.module.addDependency(dep);
				return dep;
			});
			if (dependencies.length > 0) {
				const dep = new HarmonyAcceptDependency(
					/** @type {Range} */
					(expr.range),
					dependencies,
					true
				);
				dep.loc = /** @type {DependencyLocation} */ (expr.loc);
				parser.state.module.addDependency(dep);
			}
		});
		hotAcceptWithoutCallback.tap(PLUGIN_NAME, (expr, requests) => {
			if (!HarmonyExports.isEnabled(parser.state)) {
				// This is not a harmony module, skip it
				return;
			}
			const dependencies = requests.map((request) => {
				const dep = new HarmonyAcceptImportDependency(request);
				dep.loc = /** @type {DependencyLocation} */ (expr.loc);
				parser.state.module.addDependency(dep);
				return dep;
			});
			if (dependencies.length > 0) {
				const dep = new HarmonyAcceptDependency(
					/** @type {Range} */
					(expr.range),
					dependencies,
					false
				);
				dep.loc = /** @type {DependencyLocation} */ (expr.loc);
				parser.state.module.addDependency(dep);
			}
		});
	}
};

module.exports.harmonySpecifierTag = harmonySpecifierTag;
