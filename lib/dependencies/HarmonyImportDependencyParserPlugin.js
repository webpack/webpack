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
const HarmonyEvaluatedImportSpecifierDependency = require("./HarmonyEvaluatedImportSpecifierDependency");
const HarmonyExports = require("./HarmonyExports");
const { ExportPresenceModes } = require("./HarmonyImportDependency");
const HarmonyImportSideEffectDependency = require("./HarmonyImportSideEffectDependency");
const HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");

/** @typedef {import("estree").ExportAllDeclaration} ExportAllDeclaration */
/** @typedef {import("estree").ExportNamedDeclaration} ExportNamedDeclaration */
/** @typedef {import("estree").Identifier} Identifier */
/** @typedef {import("estree").ImportDeclaration} ImportDeclaration */
/** @typedef {import("estree").ImportExpression} ImportExpression */
/** @typedef {import("estree").Literal} Literal */
/** @typedef {import("estree").MemberExpression} MemberExpression */
/** @typedef {import("estree").ObjectExpression} ObjectExpression */
/** @typedef {import("estree").Property} Property */
/** @typedef {import("../../declarations/WebpackOptions").JavascriptParserOptions} JavascriptParserOptions */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../javascript/BasicEvaluatedExpression")} BasicEvaluatedExpression */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
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
 * @param {ImportDeclaration | ExportNamedDeclaration | ExportAllDeclaration | (ImportExpression & { arguments?: ObjectExpression[] })} node node with assertions
 * @returns {Record<string, any> | undefined} assertions
 */
function getAttributes(node) {
	if (
		node.type === "ImportExpression" &&
		node.arguments &&
		node.arguments[0] &&
		node.arguments[0].type === "ObjectExpression" &&
		node.arguments[0].properties[0] &&
		node.arguments[0].properties[0].type === "Property" &&
		node.arguments[0].properties[0].value.type === "ObjectExpression" &&
		node.arguments[0].properties[0].value.properties
	) {
		const properties = /** @type {Property[]} */ (
			node.arguments[0].properties[0].value.properties
		);
		const result = {};
		for (const property of properties) {
			const key =
				property.key.type === "Identifier"
					? property.key.name
					: /** @type {Literal} */ (property.key).value;
			result[key] = /** @type {Literal} */ (property.value).value;
		}
		return result;
	}
	// TODO remove cast when @types/estree has been updated to import assertions
	const attributes =
		/** @type {{ assertions?: ImportAttributeNode[] }} */
		(node).assertions;
	if (attributes === undefined) {
		return undefined;
	}
	const result = {};
	for (const attribute of attributes) {
		const key =
			attribute.key.type === "Identifier"
				? attribute.key.name
				: attribute.key.value;
		result[key] = attribute.value.value;
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

		function getNonOptionalPart(members, membersOptionals) {
			let i = 0;
			while (i < members.length && membersOptionals[i] === false) i++;
			return i !== members.length ? members.slice(0, i) : members;
		}

		function getNonOptionalMemberChain(node, count) {
			while (count--) node = node.object;
			return node;
		}

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
					parser.isAsiPosition(/** @type {Range} */ (statement.range)[0])
						? ";"
						: "",
					/** @type {Range} */ (statement.range)
				);
				clearDep.loc = /** @type {DependencyLocation} */ (statement.loc);
				parser.state.module.addPresentationalDependency(clearDep);
				parser.unsetAsiPosition(/** @type {Range} */ (statement.range)[1]);
				const attributes = getAttributes(statement);
				const sideEffectDep = new HarmonyImportSideEffectDependency(
					/** @type {string} */ (source),
					parser.state.lastHarmonyImportOrder,
					attributes
				);
				sideEffectDep.loc = /** @type {DependencyLocation} */ (statement.loc);
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
					assertions: getAttributes(statement)
				});
				return true;
			}
		);
		parser.hooks.binaryExpression.tap(
			"HarmonyImportDependencyParserPlugin",
			expression => {
				if (expression.operator !== "in") return;

				const leftPartEvaluated = parser.evaluateExpression(expression.left);
				if (leftPartEvaluated.couldHaveSideEffects()) return;
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
				)
					return;
				const settings = rootInfo.tagInfo.data;
				const members = rightPart.getMembers();
				const dep = new HarmonyEvaluatedImportSpecifierDependency(
					settings.source,
					settings.sourceOrder,
					settings.ids.concat(members).concat([leftPart]),
					settings.name,
					/** @type {Range} */ (expression.range),
					settings.assertions,
					"in"
				);
				dep.directImport = members.length === 0;
				dep.asiSafe = !parser.isAsiPosition(
					/** @type {Range} */ (expression.range)[0]
				);
				dep.loc = /** @type {DependencyLocation} */ (expression.loc);
				parser.state.module.addDependency(dep);
				InnerGraph.onUsage(parser.state, e => (dep.usedByExports = e));
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
					/** @type {Range} */ (expr.range),
					exportPresenceMode,
					settings.assertions,
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
				InnerGraph.onUsage(parser.state, e => (dep.usedByExports = e));
				return true;
			});
		parser.hooks.expressionMemberChain
			.for(harmonySpecifierTag)
			.tap(
				"HarmonyImportDependencyParserPlugin",
				(expression, members, membersOptionals, memberRanges) => {
					const settings = /** @type {HarmonySettings} */ (
						parser.currentTagData
					);
					const nonOptionalMembers = getNonOptionalPart(
						members,
						membersOptionals
					);
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
					const ids = settings.ids.concat(nonOptionalMembers);
					const dep = new HarmonyImportSpecifierDependency(
						settings.source,
						settings.sourceOrder,
						ids,
						settings.name,
						/** @type {Range} */ (expr.range),
						exportPresenceMode,
						settings.assertions,
						ranges
					);
					dep.referencedPropertiesInDestructuring =
						parser.destructuringAssignmentPropertiesFor(expr);
					dep.asiSafe = !parser.isAsiPosition(
						/** @type {Range} */ (expr.range)[0]
					);
					dep.loc = /** @type {DependencyLocation} */ (expr.loc);
					parser.state.module.addDependency(dep);
					InnerGraph.onUsage(parser.state, e => (dep.usedByExports = e));
					return true;
				}
			);
		parser.hooks.callMemberChain
			.for(harmonySpecifierTag)
			.tap(
				"HarmonyImportDependencyParserPlugin",
				(expression, members, membersOptionals, memberRanges) => {
					const { arguments: args, callee } = expression;
					const settings = /** @type {HarmonySettings} */ (
						parser.currentTagData
					);
					const nonOptionalMembers = getNonOptionalPart(
						members,
						membersOptionals
					);
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
					const ids = settings.ids.concat(nonOptionalMembers);
					const dep = new HarmonyImportSpecifierDependency(
						settings.source,
						settings.sourceOrder,
						ids,
						settings.name,
						/** @type {Range} */ (expr.range),
						exportPresenceMode,
						settings.assertions,
						ranges
					);
					dep.directImport = members.length === 0;
					dep.call = true;
					dep.asiSafe = !parser.isAsiPosition(
						/** @type {Range} */ (expr.range)[0]
					);
					// only in case when we strictly follow the spec we need a special case here
					dep.namespaceObjectAsContext =
						members.length > 0 && this.strictThisContextOnImports;
					dep.loc = /** @type {DependencyLocation} */ (expr.loc);
					parser.state.module.addDependency(dep);
					if (args) parser.walkExpressions(args);
					InnerGraph.onUsage(parser.state, e => (dep.usedByExports = e));
					return true;
				}
			);
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
// TODO remove it in webpack@6 in favor getAttributes
module.exports.getAssertions = getAttributes;
module.exports.getAttributes = getAttributes;
