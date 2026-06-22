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
const { IMPORT_META_NAMES } = require("./ImportMetaPlugin");

/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */

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

		parser.hooks.topLevelAwait.tap(PLUGIN_NAME, () => {
			const module = parser.state.module;
			enableHarmony(false);
			/** @type {BuildMeta} */
			(module.buildMeta).async = true;
			EnvironmentNotSupportAsyncWarning.check(
				module,
				parser.state.compilation.runtimeTemplate,
				"topLevelAwait"
			);
		});

		// Using `import.meta` only parses as a module, so it marks the module ESM.
		// Non-bailing and run before ImportMetaPlugin so its handling still runs;
		// unknown members go through `unhandledExpressionMemberChain`.
		const onImportMeta = () => {
			enableHarmony(false);
		};
		for (const name of IMPORT_META_NAMES) {
			parser.hooks.expression.for(name).tap(PLUGIN_NAME, onImportMeta);
			parser.hooks.typeof.for(name).tap(PLUGIN_NAME, onImportMeta);
		}
		parser.hooks.expressionMemberChain
			.for("import.meta")
			.tap(PLUGIN_NAME, onImportMeta);
		parser.hooks.unhandledExpressionMemberChain
			.for("import.meta")
			.tap(PLUGIN_NAME, onImportMeta);

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
