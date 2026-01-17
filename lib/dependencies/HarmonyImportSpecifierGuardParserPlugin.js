/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const { VariableInfo } = require("../javascript/JavascriptParser");
const AppendOnlyStackedSet = require("../util/AppendOnlyStackedSet");
const { ExportPresenceModes } = require("./HarmonyImportDependency");
const {
	harmonySpecifierGuardTag,
	harmonySpecifierTag
} = require("./HarmonyImportDependencyParserPlugin");

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
/** @typedef {import("./HarmonyImportDependencyParserPlugin").HarmonySettings} HarmonySettings */
/** @typedef {import("./HarmonyImportDependency").ExportPresenceMode} ExportPresenceMode */

/**
 * @typedef {object} HarmonyGuardsSettings
 * @property {AppendOnlyStackedSet<string> | undefined} guards
 */

/** @typedef {Map<string, Set<string>>} Guards Map of import root to guarded member keys */

const PLUGIN_NAME = "HarmonyImportSpecifierGuardParserPlugin";

/** @type {(members: Members) => string} */
const getMembersKey = (members) => members.join(".");

module.exports = class HarmonyImportSpecifierGuardParserPlugin {
	/**
	 * @param {JavascriptParserOptions} options options
	 */
	constructor(options) {
		const { importExportsPresence, exportsPresence, strictExportPresence } =
			options;

		this.exportPresenceMode =
			importExportsPresence !== undefined
				? ExportPresenceModes.fromUserOption(importExportsPresence)
				: exportsPresence !== undefined
					? ExportPresenceModes.fromUserOption(exportsPresence)
					: strictExportPresence
						? ExportPresenceModes.ERROR
						: ExportPresenceModes.AUTO;
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

		const guardSettings = /** @type {HarmonyGuardsSettings=} */ (
			parser.getTagData(harmonySettings.name, harmonySpecifierGuardTag)
		);
		return guardSettings &&
			guardSettings.guards &&
			guardSettings.guards.has(getMembersKey(ids))
			? false
			: this.exportPresenceMode;
	}

	/**
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
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
			guards.set(root, new Set([membersKey]));
		};

		/**
		 * @param {Expression} expression expression
		 * @param {boolean} needsTruthy need to be truthy
		 * @param {Guards} guards guards
		 */
		const collect = (expression, needsTruthy, guards) => {
			if (
				expression.type === "UnaryExpression" &&
				expression.operator === "!"
			) {
				collect(expression.argument, !needsTruthy, guards);
				return;
			}

			if (expression.type === "LogicalExpression" && needsTruthy) {
				if (expression.operator === "&&") {
					collect(expression.left, true, guards);
					collect(expression.right, true, guards);
					return;
				}
				if (expression.operator === "||") {
					const leftEvaluation = parser.evaluateExpression(expression.left);
					const leftBool = leftEvaluation.asBool();
					if (leftBool === true) {
						collect(expression.left, true, guards);
						return;
					}
					if (leftBool === false) {
						collect(expression.right, true, guards);
					}
					return;
				}
			}

			if (
				expression.type === "BinaryExpression" &&
				expression.operator === "in"
			) {
				if (!needsTruthy) return;
				const leftEvaluation = parser.evaluateExpression(expression.left);
				if (leftEvaluation.couldHaveSideEffects()) return;
				const propertyName = leftEvaluation.asString();
				if (!propertyName) return;
				const info = getHarmonyImportInfo(expression.right);
				if (!info) return;
				addToGuards(guards, info.root, [...info.members, propertyName]);
				return;
			}

			if (!needsTruthy) return;
			const info = getHarmonyImportInfo(expression);
			if (!info) return;
			addToGuards(guards, info.root, info.members);
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
					const existingSettings = /** @type {HarmonyGuardsSettings=} */ (
						parser.getTagData(rootName, harmonySpecifierGuardTag)
					);

					const mergedGuards =
						existingSettings && existingSettings.guards
							? existingSettings.guards.createChild()
							: new AppendOnlyStackedSet();

					for (const memberKey of members) mergedGuards.add(memberKey);
					/** @type {HarmonyGuardsSettings} */
					const settings = {
						guards: mergedGuards
					};

					parser.tagVariable(rootName, harmonySpecifierGuardTag, settings);

					restoreFns.push(() => {
						settings.guards = existingSettings && existingSettings.guards;
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

		parser.hooks.collectImportSpecifierGuards.tap(PLUGIN_NAME, (expression) => {
			if (parser.scope.isAsmJs) return;
			/** @type {Guards} */
			const guards = new Map();
			collect(expression, true, guards);
			if (guards.size === 0) return;
			return (walk) => {
				withGuards(guards, walk);
			};
		});
	}
};

module.exports.harmonyImportGuard = harmonySpecifierGuardTag;
