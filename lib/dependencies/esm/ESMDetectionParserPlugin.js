/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	hasTopLevelUsingDeclaration
} = require("../../javascript/JavascriptParserHelpers");
const { Field, NodeType } = require("../../javascript/syntax-parser");
const {
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../../module/ModuleTypeConstants");
const memoize = require("../../util/memoize");

const DynamicExports = require("../helpers/DynamicExports");
const {
	IMPORT_META_NAMES,
	IMPORT_META_STAGE_ESM_DETECTION
} = require("../import-meta/ImportMetaPlugin");
const ESMCompatibilityDependency = require("./ESMCompatibilityDependency");
const ESMExports = require("./ESMExports");
const TopLevelAwaitDependency = require("./TopLevelAwaitDependency");

const getEnvironmentNotSupportAsyncWarning = memoize(() =>
	require("../../errors/EnvironmentNotSupportAsyncWarning")
);

/** @import JavascriptParser, { JavascriptNodeReader } from "../../javascript/JavascriptParser" */

const PLUGIN_NAME = "ESMDetectionParserPlugin";

module.exports = class ESMDetectionParserPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		let topLevelUsingDeclaration = false;

		// `import.meta`/top-level `await` only parse as modules, so their presence
		// alone marks the module as ESM (matching Node.js syntax detection).
		/**
		 * @param {boolean} isStrictHarmony strict harmony mode should be enabled
		 * @returns {void}
		 */
		const enableHarmony = (isStrictHarmony) => {
			if (ESMExports.isEnabled(parser.state)) return;
			const module = parser.state.module;
			const compatDep = new ESMCompatibilityDependency(
				topLevelUsingDeclaration
			);
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
			ESMExports.enable(parser.state, isStrictHarmony);
			parser.scope.isStrict = true;
		};

		/**
		 * Marks the module as ESM where its type or its top level says so.
		 * @param {() => boolean} hasModuleStatement whether the top level imports or exports
		 * @returns {void}
		 */
		const detectHarmony = (hasModuleStatement) => {
			const isStrictHarmony =
				parser.state.module.type === JAVASCRIPT_MODULE_TYPE_ESM;
			if (isStrictHarmony || hasModuleStatement()) {
				enableHarmony(isStrictHarmony);
			}
		};
		// it reads every top-level statement, so by id
		parser.hooks.program.tap({ name: PLUGIN_NAME, path: true }, (path, ast) => {
			topLevelUsingDeclaration = hasTopLevelUsingDeclaration(path, ast);
			const count = path.fieldCount(Field.body, ast);
			detectHarmony(() => {
				for (let i = 0; i < count; i++) {
					switch (path.type(path.field(i, Field.body, ast))) {
						case NodeType.ImportDeclaration:
						case NodeType.ExportDefaultDeclaration:
						case NodeType.ExportNamedDeclaration:
						case NodeType.ExportAllDeclaration:
							return true;
					}
				}
				return false;
			});
		});

		parser.hooks.topLevelAwait.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, node) => {
				const module = parser.state.module;
				enableHarmony(false);
				module.buildMeta.async = true;
				const buildInfo = module.buildInfo;
				if (path.type(node) === NodeType.AwaitExpression) {
					// Record for a possible `await` -> `(yield …)` rewrite when the module
					// is lowered to a generator (target without `async`/`await`).
					module.addPresentationalDependency(
						new TopLevelAwaitDependency(path.range(node))
					);
				} else {
					// `for await…of` and `await using` can't be expressed as a generator;
					// never lower it.
					buildInfo.usesTopLevelAwaitForOf = true;
				}
				const { runtimeTemplate } = parser.state.compilation;
				if (
					!runtimeTemplate.supportsAsyncFunction() &&
					(!runtimeTemplate.supportsGenerator() ||
						buildInfo.usesTopLevelAwaitForOf)
				) {
					module.addWarning(
						new (getEnvironmentNotSupportAsyncWarning())(
							module,
							"topLevelAwait"
						)
					);
				}
			}
		);

		// `import.meta` parses only as a module, so it marks this one ESM. Staged
		// before the bailing DefinePlugin and ImportMetaPlugin taps, so it observes
		// every access without ending the chain.
		const onImportMeta = () => {
			enableHarmony(false);
		};
		for (const name of IMPORT_META_NAMES) {
			parser.hooks.expression.for(name).tap(
				{
					name: PLUGIN_NAME,
					stage: IMPORT_META_STAGE_ESM_DETECTION,
					path: true
				},
				onImportMeta
			);
			parser.hooks.typeof.for(name).tap(
				{
					name: PLUGIN_NAME,
					stage: IMPORT_META_STAGE_ESM_DETECTION,
					path: true
				},
				onImportMeta
			);
		}
		parser.hooks.expressionMemberChain.for("import.meta").tap(
			{
				name: PLUGIN_NAME,
				stage: IMPORT_META_STAGE_ESM_DETECTION,
				path: true
			},
			onImportMeta
		);
		parser.hooks.unhandledExpressionMemberChain.for("import.meta").tap(
			{
				name: PLUGIN_NAME,
				stage: IMPORT_META_STAGE_ESM_DETECTION,
				path: true
			},
			onImportMeta
		);

		/**
		 * Returns true if in harmony.
		 * @returns {boolean | undefined} true if in harmony
		 */
		const skipInHarmony = () => {
			if (ESMExports.isEnabled(parser.state)) {
				return true;
			}
		};

		/**
		 * Returns null if in harmony.
		 * @returns {null | undefined} null if in harmony
		 */
		const nullInHarmony = () => {
			if (ESMExports.isEnabled(parser.state)) {
				return null;
			}
		};

		/**
		 * Walks call arguments so import bindings used inside callbacks are
		 * still tracked, then skips default AMD/CommonJS handling.
		 * @param {JavascriptNodeReader} path the reader of the call
		 * @param {number} expr call expression
		 * @returns {boolean | undefined} true if in harmony
		 */
		const walkArgumentsAndSkipInHarmony = (path, expr) => {
			if (ESMExports.isEnabled(parser.state)) {
				const count = path.fieldCount(Field.arguments, expr);
				for (let i = 0; i < count; i++) {
					parser.walkExpression(
						parser.nodeOfPath(path, path.field(i, Field.arguments, expr))
					);
				}
				return true;
			}
		};

		const nonHarmonyIdentifiers = ["define", "exports"];
		for (const identifier of nonHarmonyIdentifiers) {
			parser.hooks.evaluateTypeof
				.for(identifier)
				.tap({ name: PLUGIN_NAME, path: true }, nullInHarmony);
			parser.hooks.typeof
				.for(identifier)
				.tap({ name: PLUGIN_NAME, path: true }, skipInHarmony);
			parser.hooks.evaluate
				.for(identifier)
				.tap({ name: PLUGIN_NAME, path: true }, nullInHarmony);
			parser.hooks.expression
				.for(identifier)
				.tap({ name: PLUGIN_NAME, path: true }, skipInHarmony);
			parser.hooks.call
				.for(identifier)
				.tap(
					{ name: PLUGIN_NAME, path: true },
					identifier === "define"
						? walkArgumentsAndSkipInHarmony
						: skipInHarmony
				);
		}
	}
};
