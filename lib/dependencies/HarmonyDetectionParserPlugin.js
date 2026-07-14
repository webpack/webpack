/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { JAVASCRIPT_MODULE_TYPE_ESM } = require("../ModuleTypeConstants");
const EnvironmentNotSupportAsyncWarning = require("../errors/EnvironmentNotSupportAsyncWarning");
const DynamicExports = require("./DynamicExports");
const HarmonyCompatibilityDependency = require("./HarmonyCompatibilityDependency");
const HarmonyExports = require("./HarmonyExports");
const {
	IMPORT_META_NAMES,
	IMPORT_META_STAGE_ESM_DETECTION
} = require("./ImportMetaPlugin");
const TopLevelAwaitDependency = require("./TopLevelAwaitDependency");

/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */

const PLUGIN_NAME = "HarmonyDetectionParserPlugin";

module.exports = class HarmonyDetectionParserPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		// `import.meta`/top-level `await` only parse as modules, so their presence
		// alone marks the module as ESM (matching Node.js syntax detection).
		/**
		 * @param {boolean} isStrictHarmony strict harmony mode should be enabled
		 * @returns {void}
		 */
		const enableHarmony = (isStrictHarmony) => {
			if (HarmonyExports.isEnabled(parser.state)) return;
			const module = parser.state.module;
			const compatDep = new HarmonyCompatibilityDependency();
			compatDep.loc = {
				start: {
					line: -1,
					column: 0
				},
				end: {
					line: -1,
					column: 0
				},
				index: -3
			};
			module.addPresentationalDependency(compatDep);
			DynamicExports.bailout(parser.state);
			HarmonyExports.enable(parser.state, isStrictHarmony);
			parser.scope.isStrict = true;
		};

		parser.hooks.program.tap(PLUGIN_NAME, (ast) => {
			const isStrictHarmony =
				parser.state.module.type === JAVASCRIPT_MODULE_TYPE_ESM;
			const isHarmony =
				isStrictHarmony ||
				ast.body.some(
					(statement) =>
						statement.type === "ImportDeclaration" ||
						statement.type === "ExportDefaultDeclaration" ||
						statement.type === "ExportNamedDeclaration" ||
						statement.type === "ExportAllDeclaration"
				);
			if (isHarmony) {
				enableHarmony(isStrictHarmony);
			}
		});

		parser.hooks.topLevelAwait.tap(PLUGIN_NAME, (node) => {
			const module = parser.state.module;
			enableHarmony(false);
			/** @type {BuildMeta} */
			(module.buildMeta).async = true;
			const buildInfo = /** @type {BuildInfo} */ (module.buildInfo);
			if (node.type === "AwaitExpression") {
				// Record for a possible `await` -> `(yield …)` rewrite when the module
				// is lowered to a generator (target without `async`/`await`).
				module.addPresentationalDependency(
					new TopLevelAwaitDependency(
						/** @type {Range} */ (node.range),
						/** @type {Range} */ (node.argument.range)
					)
				);
			} else {
				// `for await…of` can't be expressed as a generator; never lower it.
				buildInfo.usesTopLevelAwaitForOf = true;
			}
			const { runtimeTemplate } = parser.state.compilation;
			if (
				!runtimeTemplate.supportsAsyncFunction() &&
				(!runtimeTemplate.supportsGenerator() ||
					buildInfo.usesTopLevelAwaitForOf)
			) {
				module.addWarning(
					new EnvironmentNotSupportAsyncWarning(module, "topLevelAwait")
				);
			}
		});

		// Using `import.meta` only parses as a module, so it marks the module ESM.
		// Non-bailing; staged before the bailing DefinePlugin and ImportMetaPlugin
		// replacement taps so it observes every access; unknown members go
		// through `unhandledExpressionMemberChain`.
		const onImportMeta = () => {
			enableHarmony(false);
		};
		const earlyTapOptions = {
			name: PLUGIN_NAME,
			stage: IMPORT_META_STAGE_ESM_DETECTION
		};
		for (const name of IMPORT_META_NAMES) {
			parser.hooks.expression.for(name).tap(earlyTapOptions, onImportMeta);
			parser.hooks.typeof.for(name).tap(earlyTapOptions, onImportMeta);
		}
		parser.hooks.expressionMemberChain
			.for("import.meta")
			.tap(earlyTapOptions, onImportMeta);
		parser.hooks.unhandledExpressionMemberChain
			.for("import.meta")
			.tap(earlyTapOptions, onImportMeta);

		/**
		 * Returns true if in harmony.
		 * @returns {boolean | undefined} true if in harmony
		 */
		const skipInHarmony = () => {
			if (HarmonyExports.isEnabled(parser.state)) {
				return true;
			}
		};

		/**
		 * Returns null if in harmony.
		 * @returns {null | undefined} null if in harmony
		 */
		const nullInHarmony = () => {
			if (HarmonyExports.isEnabled(parser.state)) {
				return null;
			}
		};

		/**
		 * Walks call arguments so import bindings used inside callbacks are
		 * still tracked, then skips default AMD/CommonJS handling.
		 * @param {import("estree").CallExpression} expr call expression
		 * @returns {boolean | undefined} true if in harmony
		 */
		const walkArgumentsAndSkipInHarmony = (expr) => {
			if (HarmonyExports.isEnabled(parser.state)) {
				if (expr.arguments) parser.walkExpressions(expr.arguments);
				return true;
			}
		};

		const nonHarmonyIdentifiers = ["define", "exports"];
		for (const identifier of nonHarmonyIdentifiers) {
			parser.hooks.evaluateTypeof
				.for(identifier)
				.tap(PLUGIN_NAME, nullInHarmony);
			parser.hooks.typeof.for(identifier).tap(PLUGIN_NAME, skipInHarmony);
			parser.hooks.evaluate.for(identifier).tap(PLUGIN_NAME, nullInHarmony);
			parser.hooks.expression.for(identifier).tap(PLUGIN_NAME, skipInHarmony);
			parser.hooks.call
				.for(identifier)
				.tap(
					PLUGIN_NAME,
					identifier === "define"
						? walkArgumentsAndSkipInHarmony
						: skipInHarmony
				);
		}
	}
};
