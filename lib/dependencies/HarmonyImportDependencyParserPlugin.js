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
const HarmonyExportPresenceImportSpecifierDependency = require("./HarmonyExportPresenceImportSpecifierDependency");
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
/** @typedef {import("../javascript/JavascriptParser").DestructuringAssignmentProperty} DestructuringAssignmentProperty */
/** @typedef {import("../javascript/JavascriptParser").ImportAttributes} ImportAttributes */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../javascript/JavascriptParser").VariableInfoInterface} VariableInfoInterface */
/** @typedef {import("../optimize/InnerGraph").InnerGraph} InnerGraph */
/** @typedef {import("../optimize/InnerGraph").TopLevelSymbol} TopLevelSymbol */
/** @typedef {import("./HarmonyImportDependency")} HarmonyImportDependency */

const harmonySpecifierTag = Symbol("harmony import");

/**
 * @typedef {object} HarmonySettings
 * @property {string[]} ids
 * @property {string} source
 * @property {number} sourceOrder
 * @property {string} name
 * @property {boolean} await
 * @property {Record<string, any> | undefined} assertions
 */

/**
 * @param {string|VariableInfoInterface|undefined} info rootInfo
 * @returns {boolean} is harmonySpecifierTag
 */
function isHarmonySpecifierTag(info) {
	if (!info || typeof info === "string") return false;
	return info.tagInfo.tag === harmonySpecifierTag;
}

/**
 * @param {ImportDeclaration | ExportNamedDeclaration | ExportAllDeclaration | (ImportExpression & { arguments?: ObjectExpression[] })} node node with assertions
 * @returns {ImportAttributes} import attributes
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
		const properties =
			/** @type {Property[]} */
			(node.arguments[0].properties[0].value.properties);
		const result = /** @type {ImportAttributes} */ ({});
		for (const property of properties) {
			const key =
				/** @type {string} */
				(
					property.key.type === "Identifier"
						? property.key.name
						: /** @type {Literal} */ (property.key).value
				);
			result[key] =
				/** @type {string} */
				(/** @type {Literal} */ (property.value).value);
		}
		const key =
			node.arguments[0].properties[0].key.type === "Identifier"
				? node.arguments[0].properties[0].key.name
				: /** @type {Literal} */ (node.arguments[0].properties[0].key).value;
		if (key === "assert") {
			result._isLegacyAssert = true;
		}
		return result;
	}
	// TODO remove cast when @types/estree has been updated to import assertions
	const isImportAssertion =
		/** @type {{ assertions?: ImportAttributeNode[] }} */ (node).assertions !==
		undefined;
	const attributes = isImportAssertion
		? /** @type {{ assertions?: ImportAttributeNode[] }} */ (node).assertions
		: /** @type {{ attributes?: ImportAttributeNode[] }} */ (node).attributes;
	if (attributes === undefined) {
		return undefined;
	}
	const result = /** @type {ImportAttributes} */ ({});
	for (const attribute of attributes) {
		const key =
			/** @type {string} */
			(
				attribute.key.type === "Identifier"
					? attribute.key.name
					: attribute.key.value
			);
		result[key] = /** @type {string} */ (attribute.value.value);
	}
	if (isImportAssertion) {
		result._isLegacyAssert = true;
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

		/**
		 * @param {string[]} ids ids
		 * @returns {string} guard name
		 */
		const createGuard = ids => ids.join(".");
		/**
		 * @param {string} guard guard
		 * @param {number} idsLength ids length
		 * @returns {number} mode
		 */
		const detectExportPresenceMode = (guard, idsLength) => {
			if (
				exportPresenceMode === ExportPresenceModes.NONE ||
				// namespace objects are safe to use
				idsLength === 0 ||
				parser.scope.guards.has(guard) ||
				// if possible guard is in guard position,
				// it is guarded by member chain minus one element. e.g.
				// if (a && a.b) {} or if (a && "c" in a.b) {}
				// a.b is guarded by a
				(parser.scope.inGuardPosition &&
					(idsLength === 1 ||
						parser.scope.guards.has(guard.slice(0, guard.lastIndexOf(".")))))
			)
				return ExportPresenceModes.NONE;

			return exportPresenceMode;
		};
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
				if (expression.operator === "in") {
					const leftPartEvaluated = parser.evaluateExpression(expression.left);
					if (!leftPartEvaluated || leftPartEvaluated.couldHaveSideEffects())
						return;
					const leftPart = leftPartEvaluated.asString();
					if (!leftPart) return;

					const rightPart = parser.evaluateExpression(expression.right);
					if (!rightPart || !rightPart.isIdentifier()) return;

					const rootInfo = rightPart.rootInfo;
					if (!isHarmonySpecifierTag(rootInfo)) return;
					const settings = /** @type {VariableInfoInterface} */ (rootInfo)
						.tagInfo.data;
					const members = rightPart.getMembers();
					const baseIds = settings.ids.concat(members);
					const ids = baseIds.concat([leftPart]);
					const dep = new HarmonyEvaluatedImportSpecifierDependency(
						settings.source,
						settings.sourceOrder,
						ids,
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

					if (parser.scope.inGuardPosition) {
						parser.scope.guards.add(createGuard(ids));
						// namespace objects and identifiers are safe to use
						if (baseIds.length > 1) {
							// check for export presence for right side expression
							const mode = detectExportPresenceMode(
								createGuard(baseIds),
								baseIds.length
							);
							// e.g if ("a" in b.c) {}
							// here "b.c" is not guarded by "b"
							if (mode !== ExportPresenceModes.NONE) {
								const dep = new HarmonyExportPresenceImportSpecifierDependency(
									settings.source,
									settings.sourceOrder,
									baseIds,
									settings.name,
									rightPart.expression.range,
									mode,
									settings.assertions
								);
								dep.loc = rightPart.expression.loc;
								parser.state.module.addDependency(dep);
							}
						}
					}

					return true;
				} else if (expression.operator === "!=") {
					if (!parser.scope.inGuardPosition) return;
					let identifierEvaluated;
					const leftPartEvaluated = parser.evaluateExpression(expression.left);
					if (!leftPartEvaluated) {
						return;
					} else if (leftPartEvaluated.isIdentifier()) {
						if (!isHarmonySpecifierTag(leftPartEvaluated.rootInfo)) return;
						identifierEvaluated = leftPartEvaluated;
					} else if (leftPartEvaluated.isFalsy() !== true) {
						return;
					}

					const rightPartEvaluated = parser.evaluateExpression(
						expression.right
					);
					if (!rightPartEvaluated) {
						return;
					} else if (
						!identifierEvaluated &&
						rightPartEvaluated.isIdentifier()
					) {
						if (!isHarmonySpecifierTag(rightPartEvaluated.rootInfo)) return;
						identifierEvaluated = rightPartEvaluated;
					} else if (rightPartEvaluated.isFalsy() !== true) {
						return;
					}

					// other hooks will add guards and dependencies
					parser.walkExpression(identifierEvaluated.expression);
					return true;
				}
			}
		);
		parser.hooks.expression
			.for(harmonySpecifierTag)
			.tap("HarmonyImportDependencyParserPlugin", expr => {
				const settings = /** @type {HarmonySettings} */ (parser.currentTagData);
				let exportPresenceModeComputed;
				// namespace object is safe to use
				if (settings.ids.length) {
					const guard = createGuard(settings.ids);
					exportPresenceModeComputed = detectExportPresenceMode(
						guard,
						settings.ids.length
					);
					if (parser.scope.inGuardPosition) parser.scope.guards.add(guard);
				}
				const dep = new HarmonyImportSpecifierDependency(
					settings.source,
					settings.sourceOrder,
					settings.ids,
					settings.name,
					/** @type {Range} */ (expr.range),
					exportPresenceModeComputed || ExportPresenceModes.NONE,
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
					const guard = createGuard(ids);
					const exportPresenceMode = detectExportPresenceMode(
						guard,
						ids.length
					);
					if (parser.scope.inGuardPosition) parser.scope.guards.add(guard);
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
						detectExportPresenceMode(createGuard(ids), ids.length),
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
