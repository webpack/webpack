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
const AppendOnlyStackedSet = require("../util/AppendOnlyStackedSet");
const ConstDependency = require("./ConstDependency");
const HarmonyAcceptDependency = require("./HarmonyAcceptDependency");
const HarmonyAcceptImportDependency = require("./HarmonyAcceptImportDependency");
const HarmonyEvaluatedImportSpecifierDependency = require("./HarmonyEvaluatedImportSpecifierDependency");
const HarmonyExports = require("./HarmonyExports");
const {
	ExportPresenceModes,
	getNonOptionalPart
} = require("./HarmonyImportDependency");
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
/** @typedef {import("./HarmonyImportDependency").ExportPresenceMode} ExportPresenceMode */
/** @typedef {import("./ImportPhase").ImportPhaseType} ImportPhaseType */

/**
 * @typedef {object} HarmonySpecifierGuards
 * @property {AppendOnlyStackedSet<string> | undefined} guards
 */

/** @typedef {Map<string, Set<string>>} Guards Map of import root to guarded member keys */

const harmonySpecifierTag = Symbol("harmony import");
const harmonySpecifierGuardTag = Symbol("harmony import guard");

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

/** @type {(members: Members) => string} */
const getMembersKey = (members) => members.join(".");

/**
 * Strip the root binding name if needed
 * @param {HarmonySettings} settings settings
 * @param {Ids} ids ids
 * @returns {Ids} ids for presence check
 */
const getIdsForPresence = (settings, ids) =>
	settings.ids.length ? ids.slice(1) : ids;

module.exports = class HarmonyImportDependencyParserPlugin {
	/**
	 * @param {JavascriptParserOptions} options options
	 */
	constructor(options) {
		this.options = options;
		/** @type {ExportPresenceMode} */
		this.exportPresenceMode = ExportPresenceModes.resolveFromOptions(
			options.importExportsPresence,
			options
		);
		this.strictThisContextOnImports = options.strictThisContextOnImports;
	}

	/**
	 * @param {JavascriptParser} parser the parser
	 * @param {Ids} ids ids
	 * @returns {ExportPresenceMode} exportPresenceMode
	 */
	getExportPresenceMode(parser, ids) {
		const harmonySettings = /** @type {HarmonySettings=} */ (
			parser.currentTagData
		);
		if (!harmonySettings) return this.exportPresenceMode;

		const data = /** @type {HarmonySpecifierGuards=} */ (
			parser.getTagData(harmonySettings.name, harmonySpecifierGuardTag)
		);
		return data && data.guards && data.guards.has(getMembersKey(ids))
			? ExportPresenceModes.NONE
			: this.exportPresenceMode;
	}

	/**
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		const getImportPhase = createGetImportPhase(this.options.deferImport);

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
					this.getExportPresenceMode(
						parser,
						getIdsForPresence(settings, settings.ids)
					),
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
						this.getExportPresenceMode(
							parser,
							getIdsForPresence(settings, ids)
						),
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
						this.getExportPresenceMode(
							parser,
							getIdsForPresence(settings, ids)
						),
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

		/**
		 * @param {Expression} expression expression
		 * @returns {{ root: string, members: Members } | undefined} info
		 */
		const getHarmonyImportInfo = (expression) => {
			const nameInfo = parser.getNameForExpression(expression);
			if (!nameInfo) return;

			const rootInfo = nameInfo.rootInfo;
			const root =
				typeof rootInfo === "string"
					? rootInfo
					: rootInfo instanceof VariableInfo
						? rootInfo.name
						: undefined;
			if (!root) return;
			if (!parser.getTagData(root, harmonySpecifierTag)) return;
			return { root, members: nameInfo.getMembers() };
		};

		/**
		 * @param {Guards} guards guards
		 * @param {string} root root name
		 * @param {Members} members members
		 */
		const addToGuards = (guards, root, members) => {
			const membersKey = getMembersKey(members);
			const guardedMembers = guards.get(root);
			if (guardedMembers) {
				guardedMembers.add(membersKey);
				return;
			}

			guards.set(
				root,
				// Adding `foo.bar` implies guarding `foo` as well
				membersKey === "" ? new Set([""]) : new Set([membersKey, ""])
			);
		};

		/**
		 * @param {Expression} expression expression
		 * @param {Guards} guards guards
		 * @param {boolean} needTruthy need to be truthy
		 */
		const collect = (expression, guards, needTruthy) => {
			// !foo
			if (
				expression.type === "UnaryExpression" &&
				expression.operator === "!"
			) {
				collect(expression.argument, guards, !needTruthy);
				return;
			} else if (expression.type === "LogicalExpression" && needTruthy) {
				// foo && bar
				if (expression.operator === "&&") {
					collect(expression.left, guards, true);
					collect(expression.right, guards, true);
				}
				// falsy || foo
				else if (expression.operator === "||") {
					const leftEvaluation = parser.evaluateExpression(expression.left);
					const leftBool = leftEvaluation.asBool();
					if (leftBool === false) {
						collect(expression.right, guards, true);
					}
				}
				// nullish ?? foo
				else if (expression.operator === "??") {
					const leftEvaluation = parser.evaluateExpression(expression.left);
					const leftNullish = leftEvaluation.asNullish();
					if (leftNullish === true) {
						collect(expression.right, guards, true);
					}
				}
				return;
			}
			if (!needTruthy) return;

			/**
			 * @param {Expression} targetExpression expression
			 * @returns {boolean} is added
			 */
			const addGuardForExpression = (targetExpression) => {
				const info = getHarmonyImportInfo(targetExpression);
				if (!info) return false;
				addToGuards(guards, info.root, info.members);
				return true;
			};

			/**
			 * @param {Expression} left left expression
			 * @param {Expression} right right expression
			 * @param {(evaluation: ReturnType<JavascriptParser["evaluateExpression"]>) => boolean} matcher matcher
			 * @returns {boolean} is added
			 */
			const addGuardForNullishCompare = (left, right, matcher) => {
				const leftEval = parser.evaluateExpression(left);
				if (leftEval && matcher(leftEval)) {
					return addGuardForExpression(right);
				}
				const rightEval = parser.evaluateExpression(right);
				if (rightEval && matcher(rightEval)) {
					return addGuardForExpression(/** @type {Expression} */ (left));
				}
				return false;
			};

			if (expression.type === "BinaryExpression") {
				// "bar" in foo
				if (expression.operator === "in") {
					const leftEvaluation = parser.evaluateExpression(expression.left);
					if (leftEvaluation.couldHaveSideEffects()) return;
					const propertyName = leftEvaluation.asString();
					if (!propertyName) return;
					parser.evaluateExpression(expression.right);
					const info = getHarmonyImportInfo(expression.right);
					if (!info) return;

					if (info.members.length) {
						for (const member of info.members) {
							addToGuards(guards, info.root, [member]);
						}
					}
					addToGuards(guards, info.root, [...info.members, propertyName]);
					return;
				}
				// foo !== undefined
				else if (
					expression.operator === "!==" &&
					addGuardForNullishCompare(
						/** @type {Expression} */ (expression.left),
						expression.right,
						(evaluation) => evaluation.isUndefined()
					)
				) {
					return;
				}
				// foo != undefined
				// foo != null
				else if (
					expression.operator === "!=" &&
					addGuardForNullishCompare(
						/** @type {Expression} */ (expression.left),
						expression.right,
						(evaluation) => Boolean(evaluation.asNullish())
					)
				) {
					return;
				}
			}
			addGuardForExpression(expression);
		};

		/**
		 * @param {Guards} guards guards
		 * @param {() => void} walk walk callback
		 * @returns {void}
		 */
		const withGuards = (guards, walk) => {
			const applyGuards = () => {
				/** @type {(() => void)[]} */
				const restoreFns = [];

				for (const [rootName, members] of guards) {
					const previous = parser.getVariableInfo(rootName);
					const exist = /** @type {HarmonySpecifierGuards=} */ (
						parser.getTagData(rootName, harmonySpecifierGuardTag)
					);

					const mergedGuards =
						exist && exist.guards
							? exist.guards.createChild()
							: new AppendOnlyStackedSet();

					for (const memberKey of members) mergedGuards.add(memberKey);
					parser.tagVariable(rootName, harmonySpecifierGuardTag, {
						guards: mergedGuards
					});
					restoreFns.push(() => {
						parser.setVariable(rootName, previous);
					});
				}

				return () => {
					for (const restore of restoreFns) {
						restore();
					}
				};
			};

			const restore = applyGuards();
			try {
				walk();
			} finally {
				restore();
			}
		};

		if (this.exportPresenceMode !== ExportPresenceModes.NONE) {
			parser.hooks.collectGuards.tap(PLUGIN_NAME, (expression) => {
				if (parser.scope.isAsmJs) return;
				/** @type {Guards} */
				const guards = new Map();
				collect(expression, guards, true);

				if (guards.size === 0) return;
				return (walk) => {
					withGuards(guards, walk);
				};
			});
		}
	}
};

module.exports.harmonySpecifierGuardTag = harmonySpecifierGuardTag;
module.exports.harmonySpecifierTag = harmonySpecifierTag;
