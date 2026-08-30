/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ImportedBindingAssignmentError = require("../errors/ImportedBindingAssignmentError");
const WebpackError = require("../errors/WebpackError");
const getParserHooks = require("../hmr/parserHooks");
const {
	VariableInfo,
	getImportAttributes
} = require("../javascript/JavascriptParser");
const { getInnerGraphUtils } = require("../optimize/InnerGraph");
const ConstDependency = require("./ConstDependency");
const HarmonyAcceptDependency = require("./HarmonyAcceptDependency");
const HarmonyAcceptImportDependency = require("./HarmonyAcceptImportDependency");
const HarmonyEvaluatedImportSpecifierDependency = require("./HarmonyEvaluatedImportSpecifierDependency");
const HarmonyExports = require("./HarmonyExports");
const {
	ExportPresenceModes,
	getNonOptionalPart
} = require("./HarmonyImportDependency");
const {
	attachDependencyGuards,
	isPresentByGuards
} = require("./HarmonyImportGuard");
const HarmonyImportSideEffectDependency = require("./HarmonyImportSideEffectDependency");
const HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");
const { ImportPhaseUtils, createGetImportPhase } = require("./ImportPhase");

/**
 * @import {
 * 	Expression,
 * 	PrivateIdentifier,
 * 	Identifier,
 * 	MemberExpression
 * } from "estree"
 */
/**
 * @import {
 * 	JavascriptParserOptions
 * } from "../../declarations/WebpackOptions"
 */
/** @import Module from "../Module" */
/** @import { JavascriptModuleBuildInfo } from "../javascript/JavascriptModule" */
/**
 * @import JavascriptParser, {
 * 	ImportAttributes,
 * 	Range,
 * 	Members
 * } from "../javascript/JavascriptParser"
 */
/** @import { Ids, ExportPresenceMode } from "./HarmonyImportDependency" */
/** @import { ImportPhaseType } from "./ImportPhase" */
/** @import { GuardFrame } from "./HarmonyImportGuard" */

const harmonySpecifierTag = Symbol("harmony import");

// Shared placeholder: plain specifier references have no member ranges, so they
// can all reuse one (never-mutated) array instead of allocating per dependency.
/** @type {Range[]} */
const EMPTY_ID_RANGES = [];

/**
 * Defines the harmony settings type used by this module.
 * @typedef {object} HarmonySettings
 * @property {Ids} ids
 * @property {string} source
 * @property {number} sourceOrder
 * @property {string} name
 * @property {boolean} await
 * @property {ImportAttributes=} attributes
 * @property {ImportPhaseType} phase
 * @property {boolean} used whether the binding is referenced anywhere
 * @property {HarmonyImportSideEffectDependency | undefined} dependency the statement's own dependency
 */

const PLUGIN_NAME = "HarmonyImportDependencyParserPlugin";

/**
 * Records that an import binding is referenced, so it is not reported as an
 * unused specifier naming a missing export.
 * @param {HarmonySettings | undefined} settings settings of the referenced tag
 * @returns {boolean} true when the reference was a harmony import specifier
 */
const markUsed = (settings) => {
	if (!settings) return false;
	settings.used = true;
	return true;
};

/**
 * Gets in operator harmony import info.
 * @param {JavascriptParser} parser the parser
 * @param {PrivateIdentifier | Expression} left left expression
 * @param {Expression} right right expression
 * @returns {{ leftPart: string, members: Members, settings: HarmonySettings } | undefined} info
 */
const getInOperatorHarmonyImportInfo = (parser, left, right) => {
	const leftPartEvaluated = parser.evaluateExpression(left);
	if (leftPartEvaluated.couldHaveSideEffects()) return;
	/** @type {string | undefined} */
	const leftPart = leftPartEvaluated.asString();
	if (!leftPart) return;

	const rightPart = parser.evaluateExpression(right);
	if (!rightPart.isIdentifier()) return;

	const rootInfo = rightPart.rootInfo;
	const root =
		typeof rootInfo === "string"
			? rootInfo
			: rootInfo instanceof VariableInfo
				? rootInfo.name
				: undefined;
	if (!root) return;

	const settings = /** @type {HarmonySettings | undefined} */ (
		parser.getTagData(root, harmonySpecifierTag)
	);
	if (!settings) {
		return;
	}
	settings.used = true;

	return {
		leftPart,
		members: /** @type {(() => Members)} */ (rightPart.getMembers)(),
		settings
	};
};

/**
 * Whether the conditional test references an imported binding (so a dependency
 * guard can possibly gate a dead branch). Cheap pre-scan over the test AST.
 * @param {JavascriptParser} parser the parser
 * @param {Expression} node test expression
 * @returns {boolean} true when the test references a harmony import specifier
 */
const findImportSpecifier = (parser, node) => {
	switch (node.type) {
		case "Identifier":
			return markUsed(
				/** @type {HarmonySettings | undefined} */
				(parser.getTagData(node.name, harmonySpecifierTag))
			);
		case "UnaryExpression":
			return findImportSpecifier(
				parser,
				/** @type {Expression} */ (node.argument)
			);
		case "LogicalExpression":
			return (
				findImportSpecifier(parser, /** @type {Expression} */ (node.left)) ||
				findImportSpecifier(parser, /** @type {Expression} */ (node.right))
			);
		case "MemberExpression":
			return findImportSpecifier(
				parser,
				/** @type {Expression} */ (node.object)
			);
		case "BinaryExpression":
			// `"x" in ns` presence guard
			return (
				node.operator === "in" &&
				findImportSpecifier(parser, /** @type {Expression} */ (node.right))
			);
		default:
			return false;
	}
};

class HarmonyImportDependencyParserPlugin {
	/**
	 * Creates an instance of HarmonyImportDependencyParserPlugin.
	 * @param {JavascriptParserOptions} options options
	 */
	constructor(options) {
		/** @type {JavascriptParserOptions} */
		this.options = options;
		/** @type {ExportPresenceMode} */
		this.exportPresenceMode = ExportPresenceModes.resolveFromOptions(
			options.importExportsPresence,
			options
		);
		/** @type {boolean | undefined} */
		this.strictThisContextOnImports = options.strictThisContextOnImports;
	}

	/**
	 * Gets export presence mode.
	 * @param {JavascriptParser} parser the parser
	 * @param {HarmonySettings} settings settings
	 * @param {Ids} ids ids
	 * @returns {ExportPresenceMode} exportPresenceMode
	 */
	getExportPresenceMode(parser, settings, ids) {
		// Guards only apply to namespace imports
		if (settings.ids.length) return this.exportPresenceMode;

		const harmonySettings = /** @type {HarmonySettings=} */ (
			parser.currentTagData
		);
		if (!harmonySettings) return this.exportPresenceMode;

		if (this.exportPresenceMode === ExportPresenceModes.NONE) {
			return this.exportPresenceMode;
		}

		const stack = /** @type {GuardFrame[] | undefined} */ (
			parser.state.guardStack
		);
		if (
			stack !== undefined &&
			isPresentByGuards(parser, stack, harmonySettings.name, ids[0])
		) {
			return ExportPresenceModes.NONE;
		}

		return this.exportPresenceMode;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		const getImportPhase = createGetImportPhase(
			this.options.deferImport,
			this.options.sourceImport
		);

		// Parsers are reused across modules, so both are reset per program.
		/** @type {HarmonySettings[]} */
		const declaredSpecifiers = [];
		/** @type {HarmonyImportSideEffectDependency | undefined} */
		let lastSideEffectDependency;

		parser.hooks.program.tap(PLUGIN_NAME, () => {
			declaredSpecifiers.length = 0;
			lastSideEffectDependency = undefined;
		});
		parser.hooks.finish.tap(PLUGIN_NAME, () => {
			for (const settings of declaredSpecifiers) {
				const dependency = settings.dependency;
				if (dependency === undefined || settings.used) continue;
				if (dependency.unusedSpecifiers === undefined) {
					dependency.unusedSpecifiers = {
						exportPresenceMode: this.exportPresenceMode,
						specifiers: []
					};
				}
				dependency.unusedSpecifiers.specifiers.push([
					settings.ids,
					settings.name
				]);
			}
			declaredSpecifiers.length = 0;
			lastSideEffectDependency = undefined;
		});

		/**
		 * Gets non optional member chain.
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
				markUsed(
					/** @type {HarmonySettings | undefined} */
					(parser.getTagData(expr.name, harmonySpecifierTag))
				)
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
			clearDep.loc = parser.getLocation(statement);
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
				error.loc = parser.getLocation(statement) || undefined;
				parser.state.current.addError(error);
			}

			const sideEffectDep = new HarmonyImportSideEffectDependency(
				/** @type {string} */ (source),
				parser.state.lastHarmonyImportOrder,
				phase,
				attributes
			);
			sideEffectDep.loc = parser.getLocation(statement);
			parser.state.module.addDependency(sideEffectDep);
			lastSideEffectDependency = sideEffectDep;
			return true;
		});
		parser.hooks.importSpecifier.tap(
			PLUGIN_NAME,
			(statement, source, id, name) => {
				const ids = id === null ? [] : [id];
				const phase = getImportPhase(parser, statement);
				const settings = /** @type {HarmonySettings} */ ({
					name,
					source,
					ids,
					sourceOrder: parser.state.lastHarmonyImportOrder,
					attributes: getImportAttributes(statement),
					phase,
					used: false,
					dependency: lastSideEffectDependency
				});
				parser.tagVariable(name, harmonySpecifierTag, settings);
				// The statement's dependency carries them, so a never-referenced
				// one still resolves; a namespace import names no export.
				if (ids.length !== 0) declaredSpecifiers.push(settings);
				return true;
			}
		);
		parser.hooks.binaryExpression.tap(PLUGIN_NAME, (expression) => {
			if (expression.operator !== "in") return;
			const info = getInOperatorHarmonyImportInfo(
				parser,
				expression.left,
				expression.right
			);
			if (!info) return;

			const { leftPart, members, settings } = info;
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
			dep.loc = parser.getLocation(expression);
			parser.state.module.addDependency(dep);
			getInnerGraphUtils(parser.state.compilation).onUsage(
				parser.state,
				(e) => (dep.usedByExports = e)
			);
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
					markUsed(
						/** @type {HarmonySettings | undefined} */
						(parser.getTagData(nameInfo.rootInfo.name, harmonySpecifierTag))
					)
				) {
					return true;
				}
			}
		);
		// Concatenation would turn the binding into a plain local, losing the
		// getter-only property whose write throws.
		parser.hooks.assign.for(harmonySpecifierTag).tap(PLUGIN_NAME, (expr) => {
			const settings = /** @type {HarmonySettings} */ (parser.currentTagData);
			markUsed(settings);
			/** @type {JavascriptModuleBuildInfo} */
			(parser.state.module.buildInfo).moduleConcatenationBailout =
				"assignment to an imported binding";
			// A named import is written through the namespace's getter-only
			// property, which throws on its own. A namespace one is the binding
			// itself, and nothing webpack can emit for it throws, so report it.
			if (settings.ids.length === 0) {
				const error = new ImportedBindingAssignmentError(settings.name);
				error.loc = parser.getLocation(expr);
				parser.state.module.addError(error);
			}
		});
		parser.hooks.expression
			.for(harmonySpecifierTag)
			.tap(PLUGIN_NAME, (expr) => {
				const settings = /** @type {HarmonySettings} */ (parser.currentTagData);
				settings.used = true;

				const dep = new HarmonyImportSpecifierDependency(
					settings.source,
					settings.sourceOrder,
					settings.ids,
					settings.name,
					/** @type {Range} */
					(expr.range),
					this.exportPresenceMode,
					settings.phase,
					settings.attributes,
					EMPTY_ID_RANGES
				);
				dep.referencedPropertiesInDestructuring =
					parser.destructuringAssignmentPropertiesFor(expr);
				dep.shorthand = parser.scope.inShorthand;
				dep.directImport = true;
				dep.asiSafe = !parser.isAsiPosition(
					/** @type {Range} */ (expr.range)[0]
				);
				dep.loc = parser.getLocation(expr);
				dep.call = parser.scope.inTaggedTemplateTag;
				parser.state.module.addDependency(dep);
				attachDependencyGuards(parser, dep);
				getInnerGraphUtils(parser.state.compilation).onUsage(
					parser.state,
					(e) => (dep.usedByExports = e)
				);
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
					settings.used = true;
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
						this.getExportPresenceMode(parser, settings, ids),
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
					dep.loc = parser.getLocation(expr);
					parser.state.module.addDependency(dep);
					attachDependencyGuards(parser, dep);
					getInnerGraphUtils(parser.state.compilation).onUsage(
						parser.state,
						(e) => (dep.usedByExports = e)
					);
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
					settings.used = true;
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
						this.getExportPresenceMode(parser, settings, ids),
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
					dep.loc = parser.getLocation(expr);
					parser.state.module.addDependency(dep);
					attachDependencyGuards(parser, dep);
					if (args) parser.walkExpressions(args);
					getInnerGraphUtils(parser.state.compilation).onUsage(
						parser.state,
						(e) => (dep.usedByExports = e)
					);
					return true;
				}
			);
		// Per the TC39 import-defer spec, [[Set]] on a Module Namespace
		// Exotic Object returns false without triggering evaluation. The
		// default expressionMemberChain path produces `<importVar>.a.foo`
		// whose `.a` getter eagerly requires (and thus evaluates) the
		// deferred module. For top-level `ns.foo = value`, walk only the
		// bare `ns` identifier so it gets replaced with the deferred
		// namespace proxy (whose set trap returns false), and leave the
		// `.foo = value` part as plain code.
		parser.hooks.assignMemberChain
			.for(harmonySpecifierTag)
			.tap(PLUGIN_NAME, (expression, members) => {
				const settings = /** @type {HarmonySettings} */ (parser.currentTagData);
				settings.used = true;
				if (!ImportPhaseUtils.isDefer(settings.phase)) return;
				if (expression.operator !== "=") return;
				if (members.length !== 1) return;
				const left = /** @type {MemberExpression} */ (expression.left);
				if (left.object.type !== "Identifier") return;
				parser.walkExpression(expression.right);
				parser.walkExpression(left.object);
				return true;
			});
		const { hotAcceptCallback, hotAcceptWithoutCallback } =
			getParserHooks(parser);
		hotAcceptCallback.tap(PLUGIN_NAME, (expr, requests) => {
			if (!HarmonyExports.isEnabled(parser.state)) {
				// This is not a harmony module, skip it
				return;
			}
			const dependencies = requests.map((request) => {
				const dep = new HarmonyAcceptImportDependency(request);
				dep.loc = parser.getLocation(expr);
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
				dep.loc = parser.getLocation(expr);
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
				dep.loc = parser.getLocation(expr);
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
				dep.loc = parser.getLocation(expr);
				parser.state.module.addDependency(dep);
			}
		});

		parser.hooks.collectGuards.tap(PLUGIN_NAME, (expression) => {
			if (parser.scope.isAsmJs) return;

			const hasSpecifier = findImportSpecifier(parser, expression);
			const depStart = hasSpecifier
				? /** @type {Module} */ (parser.state.module).dependencies.length
				: undefined;

			if (depStart === undefined) return;

			/** @type {GuardFrame} */
			const consequent = {
				test: expression,
				depStart,
				condition: true
			};
			/** @type {GuardFrame | undefined} */
			const alternate =
				depStart === undefined
					? undefined
					: { test: expression, depStart, condition: false };

			return { consequent, alternate };
		});
	}
}

HarmonyImportDependencyParserPlugin.harmonySpecifierTag = harmonySpecifierTag;

module.exports = HarmonyImportDependencyParserPlugin;
