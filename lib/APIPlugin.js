/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	getExternalModuleNodeCommonjsInitFragment
} = require("./ExternalModule");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("./ModuleTypeConstants");
const RuntimeGlobals = require("./RuntimeGlobals");
const ConstDependency = require("./dependencies/ConstDependency");
const ModuleInitFragmentDependency = require("./dependencies/ModuleInitFragmentDependency");
const RuntimeRequirementsDependency = require("./dependencies/RuntimeRequirementsDependency");
const WebpackError = require("./errors/WebpackError");
const BasicEvaluatedExpression = require("./javascript/BasicEvaluatedExpression");
const JavascriptModulesPlugin = require("./javascript/JavascriptModulesPlugin");
const {
	evaluateToString,
	toConstantDependency
} = require("./javascript/JavascriptParserHelpers");
const ChunkNameRuntimeModule = require("./runtime/ChunkNameRuntimeModule");
const GetFullHashRuntimeModule = require("./runtime/GetFullHashRuntimeModule");
const memoize = require("./util/memoize");
const { forEachRuntime } = require("./util/runtime");

const getConcatenatedModule = memoize(() =>
	require("./optimize/ConcatenatedModule")
);

/** @import Compiler from "./Compiler" */
/** @import Module, { BuildInfo } from "./Module" */
/**
 * @import {
 * 	JavascriptModuleBuildInfo
 * } from "./javascript/JavascriptModule"
 */
/** @import Compilation from "./Compilation" */
/** @import ChunkGraph from "./ChunkGraph" */
/** @import JavascriptParser, { Range } from "./javascript/JavascriptParser" */

// Modules that reassign `__webpack_public_path__` at runtime, by compilation. A baked
// analyzable specifier can't reflect that, so those forms fall back. Also recorded per
// module in `buildInfo`, because a module restored from the persistent cache is never
// re-parsed and would otherwise lose the flag.
/** @type {WeakMap<Compilation, Set<Module>>} */
const runtimePublicPathOverride = new WeakMap();

/**
 * @param {Compilation} compilation compilation
 * @param {Module} module the module doing the reassigning
 * @returns {void}
 */
const addRuntimePublicPathOverride = (compilation, module) => {
	const modules = runtimePublicPathOverride.get(compilation);
	if (modules === undefined) {
		runtimePublicPathOverride.set(compilation, new Set([module]));
	} else {
		modules.add(module);
	}
};

/**
 * @param {Compilation} compilation compilation
 * @returns {boolean} true when any module reassigns `__webpack_public_path__` at runtime
 */
const usesRuntimePublicPathOverride = (compilation) =>
	runtimePublicPathOverride.has(compilation);

// `__webpack_require__.p` belongs to a runtime, so a reassignment only reaches the
// runtimes the reassigning module is instantiated in. Computed once the chunk graph
// can answer that, which is any time code is being generated.
/** @type {WeakMap<ChunkGraph, Set<string>>} */
const overriddenRuntimes = new WeakMap();

/**
 * Whether the public path is reassigned in any runtime `module` belongs to. Falls back
 * to the whole compilation when there is no chunk graph to place the module in.
 * @param {Compilation} compilation compilation
 * @param {ChunkGraph=} chunkGraph the chunk graph
 * @param {Module=} module the module a reference is emitted into
 * @returns {boolean} true when a reassignment can reach this module's runtimes
 */
const runtimeUsesPublicPathOverride = (compilation, chunkGraph, module) => {
	const modules = runtimePublicPathOverride.get(compilation);
	if (modules === undefined) return false;
	if (chunkGraph === undefined || module === undefined) return true;
	// Keyed by the chunk graph, not the compilation: `executeModule` asks with a
	// throw-away one whose answer must not outlive it.
	let runtimes = overriddenRuntimes.get(chunkGraph);
	if (runtimes === undefined) {
		/** @type {Set<string>} */
		const collected = new Set();
		const ConcatenatedModule = getConcatenatedModule();
		for (const overriding of modules) {
			// Concatenation may have absorbed the reassigning module, and the chunk graph
			// places only the `ConcatenatedModule` that replaced it.
			for (const runtime of chunkGraph.getModuleRuntimes(
				ConcatenatedModule.getChunkGraphModule(compilation, overriding)
			)) {
				forEachRuntime(runtime, (key) => {
					collected.add(/** @type {string} */ (key));
				});
			}
		}
		runtimes = collected;
		overriddenRuntimes.set(chunkGraph, collected);
	}
	const overridden = runtimes;
	if (overridden.size === 0) return false;
	/** @type {Set<string>} */
	const own = new Set();
	for (const runtime of chunkGraph.getModuleRuntimes(module)) {
		forEachRuntime(runtime, (key) => {
			own.add(/** @type {string} */ (key));
		});
	}
	for (const key of own) {
		if (overridden.has(key)) return true;
	}
	return false;
};

/**
 * Returns the replacement definitions used for webpack API identifiers.
 * @returns {Record<string, { expr: string, req: string[] | null, type?: string, assign: boolean }>} replacements
 */
function getReplacements() {
	return {
		__webpack_require__: {
			expr: RuntimeGlobals.require,
			req: [RuntimeGlobals.require],
			type: "function",
			assign: false
		},
		__webpack_global__: {
			expr: RuntimeGlobals.require,
			req: [RuntimeGlobals.require],
			type: "function",
			assign: false
		},
		__webpack_public_path__: {
			expr: RuntimeGlobals.publicPath,
			req: [RuntimeGlobals.publicPath],
			type: "string",
			assign: true
		},
		__webpack_base_uri__: {
			expr: RuntimeGlobals.baseURI,
			req: [RuntimeGlobals.baseURI],
			type: "string",
			assign: true
		},
		__webpack_modules__: {
			expr: RuntimeGlobals.moduleFactories,
			req: [RuntimeGlobals.moduleFactories],
			type: "object",
			assign: false
		},
		__webpack_chunk_load__: {
			expr: RuntimeGlobals.ensureChunk,
			req: [RuntimeGlobals.ensureChunk],
			type: "function",
			assign: true
		},
		__non_webpack_require__: {
			expr: "require",
			req: null,
			type: undefined, // type is not known, depends on environment
			assign: true
		},
		__webpack_nonce__: {
			expr: RuntimeGlobals.scriptNonce,
			req: [RuntimeGlobals.scriptNonce],
			type: "string",
			assign: true
		},
		__webpack_hash__: {
			expr: `${RuntimeGlobals.getFullHash}()`,
			req: [RuntimeGlobals.getFullHash],
			type: "string",
			assign: false
		},
		__webpack_css_server_styles__: {
			expr: `${RuntimeGlobals.getCssServerStyles}()`,
			req: [RuntimeGlobals.getCssServerStyles],
			type: "string",
			assign: false
		},
		__webpack_chunkname__: {
			expr: RuntimeGlobals.chunkName,
			req: [RuntimeGlobals.chunkName],
			type: "string",
			assign: false
		},
		__webpack_get_script_filename__: {
			expr: RuntimeGlobals.getChunkScriptFilename,
			req: [RuntimeGlobals.getChunkScriptFilename],
			type: "function",
			assign: true
		},
		__webpack_runtime_id__: {
			expr: RuntimeGlobals.runtimeId,
			req: [RuntimeGlobals.runtimeId],
			assign: false
		},
		"require.onError": {
			expr: RuntimeGlobals.uncaughtErrorHandler,
			req: [RuntimeGlobals.uncaughtErrorHandler],
			type: undefined, // type is not known, could be function or undefined
			assign: true // is never a pattern
		},
		__system_context__: {
			expr: RuntimeGlobals.systemContext,
			req: [RuntimeGlobals.systemContext],
			type: "object",
			assign: false
		},
		__webpack_share_scopes__: {
			expr: RuntimeGlobals.shareScopeMap,
			req: [RuntimeGlobals.shareScopeMap],
			type: "object",
			assign: false
		},
		__webpack_init_sharing__: {
			expr: RuntimeGlobals.initializeSharing,
			req: [RuntimeGlobals.initializeSharing],
			type: "function",
			assign: true
		}
	};
}

const PLUGIN_NAME = "APIPlugin";

class APIPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				const moduleOutput = compilation.options.output.module;
				const nodeTarget = compiler.platform.node;
				const nodeEsm = moduleOutput && nodeTarget;

				const REPLACEMENTS = getReplacements();
				if (nodeEsm) {
					REPLACEMENTS.__non_webpack_require__.expr =
						"__WEBPACK_EXTERNAL_createRequire_require";
				}

				// A cached module skips parsing, so replay its recorded override flag.
				compilation.hooks.stillValidModule.tap(PLUGIN_NAME, (module) => {
					const buildInfo =
						/** @type {JavascriptModuleBuildInfo | undefined} */
						(module.buildInfo);
					if (buildInfo && buildInfo.usingPublicPathOverride) {
						addRuntimePublicPathOverride(compilation, module);
					}
				});

				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);
				compilation.dependencyTemplates.set(
					ModuleInitFragmentDependency,
					new ModuleInitFragmentDependency.Template()
				);

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.chunkName)
					.tap(PLUGIN_NAME, (chunk) => {
						compilation.addRuntimeModule(
							chunk,
							new ChunkNameRuntimeModule(/** @type {string} */ (chunk.name))
						);
						return true;
					});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.getFullHash)
					.tap(PLUGIN_NAME, (chunk, _set) => {
						compilation.addRuntimeModule(chunk, new GetFullHashRuntimeModule());
						return true;
					});

				const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);

				hooks.renderModuleContent.tap(
					PLUGIN_NAME,
					(source, module, renderContext) => {
						if (
							/** @type {JavascriptModuleBuildInfo} */ (module.buildInfo)
								.needCreateRequire
						) {
							const chunkInitFragments = [
								getExternalModuleNodeCommonjsInitFragment(
									renderContext.runtimeTemplate
								)
							];

							renderContext.chunkInitFragments.push(...chunkInitFragments);
						}

						return source;
					}
				);

				/**
				 * Handles the hook callback for this code path.
				 * @param {JavascriptParser} parser the parser
				 */
				const handler = (parser) => {
					parser.hooks.preDeclarator.tap(PLUGIN_NAME, (declarator) => {
						if (
							parser.scope.topLevelScope === true &&
							declarator.id.type === "Identifier" &&
							declarator.id.name === "module"
						) {
							/** @type {BuildInfo} */
							(parser.state.module.buildInfo).moduleArgument =
								"__webpack_module__";
						}
					});

					/**
					 * @param {import("estree").Statement | import("estree").ModuleDeclaration | import("estree").MaybeNamedFunctionDeclaration | import("estree").MaybeNamedClassDeclaration} statement statement
					 */
					const moduleDeclarationHandler = (statement) => {
						if (
							parser.scope.topLevelScope === true &&
							(statement.type === "FunctionDeclaration" ||
								statement.type === "ClassDeclaration") &&
							statement.id &&
							statement.id.name === "module"
						) {
							/** @type {BuildInfo} */
							(parser.state.module.buildInfo).moduleArgument =
								"__webpack_module__";
						}
					};
					parser.hooks.preStatementByType
						.for("FunctionDeclaration")
						.tap(PLUGIN_NAME, moduleDeclarationHandler);
					parser.hooks.preStatementByType
						.for("ClassDeclaration")
						.tap(PLUGIN_NAME, moduleDeclarationHandler);

					for (const key of Object.keys(REPLACEMENTS)) {
						const info = REPLACEMENTS[key];
						parser.hooks.expression.for(key).tap(PLUGIN_NAME, (expression) => {
							const dep = toConstantDependency(parser, info.expr, info.req);

							if (key === "__non_webpack_require__" && moduleOutput) {
								if (nodeTarget) {
									/** @type {JavascriptModuleBuildInfo} */
									(parser.state.module.buildInfo).needCreateRequire = true;
								} else {
									const warning = new WebpackError(
										`${PLUGIN_NAME}\n__non_webpack_require__ is only allowed in target node`
									);
									warning.loc = parser.getLocation(expression);
									warning.module = parser.state.module;
									compilation.warnings.push(warning);
								}
							}

							return dep(expression);
						});
						if (info.assign === false) {
							parser.hooks.assign.for(key).tap(PLUGIN_NAME, (expr) => {
								const err = new WebpackError(`${key} must not be assigned`);
								err.loc = parser.getLocation(expr);
								throw err;
							});
						} else if (key === "__webpack_public_path__") {
							// Writing the slot needs the scope it lives on, not the runtime
							// module computing the value it replaces; a read asks for that.
							const writePublicPath = toConstantDependency(parser, info.expr, [
								RuntimeGlobals.requireScope
							]);
							parser.hooks.assign.for(key).tap(PLUGIN_NAME, (expr) => {
								/** @type {JavascriptModuleBuildInfo} */
								(parser.state.module.buildInfo).usingPublicPathOverride = true;
								addRuntimePublicPathOverride(compilation, parser.state.module);
								// A destructuring target is no expression to replace; the read
								// handler still spells the global, with a read's requirement.
								if (expr.left.type !== "Identifier") return;
								return writePublicPath(expr.left);
							});
						}
						if (info.type) {
							parser.hooks.evaluateTypeof
								.for(key)
								.tap(PLUGIN_NAME, evaluateToString(info.type));
						}
					}

					parser.hooks.expression
						.for("__webpack_layer__")
						.tap(PLUGIN_NAME, (expr) => {
							const dep = new ConstDependency(
								JSON.stringify(parser.state.module.layer),
								/** @type {Range} */ (expr.range)
							);
							dep.loc = parser.getLocation(expr);
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
					parser.hooks.evaluateIdentifier
						.for("__webpack_layer__")
						.tap(PLUGIN_NAME, (expr) =>
							(parser.state.module.layer === null
								? new BasicEvaluatedExpression().setNull()
								: new BasicEvaluatedExpression().setString(
										parser.state.module.layer
									)
							).setRange(/** @type {Range} */ (expr.range))
						);
					parser.hooks.evaluateTypeof
						.for("__webpack_layer__")
						.tap(PLUGIN_NAME, (expr) =>
							new BasicEvaluatedExpression()
								.setString(
									parser.state.module.layer === null ? "object" : "string"
								)
								.setRange(/** @type {Range} */ (expr.range))
						);

					parser.hooks.expression
						.for("__webpack_module__.id")
						.tap(PLUGIN_NAME, (expr) => {
							/** @type {JavascriptModuleBuildInfo} */
							(parser.state.module.buildInfo).moduleConcatenationBailout =
								"__webpack_module__.id";
							const moduleArgument = parser.state.module.moduleArgument;
							if (moduleArgument === "__webpack_module__") {
								const dep = new RuntimeRequirementsDependency([
									RuntimeGlobals.moduleId
								]);
								dep.loc = parser.getLocation(expr);
								parser.state.module.addPresentationalDependency(dep);
							} else {
								const initDep = new ModuleInitFragmentDependency(
									`var __webpack_internal_module_id__ = ${moduleArgument}.id;\n`,
									[RuntimeGlobals.moduleId],
									"__webpack_internal_module_id__"
								);
								parser.state.module.addPresentationalDependency(initDep);
								const dep = new ConstDependency(
									"__webpack_internal_module_id__",
									/** @type {Range} */ (expr.range),
									[]
								);
								dep.loc = parser.getLocation(expr);
								parser.state.module.addPresentationalDependency(dep);
							}
							return true;
						});

					parser.hooks.expression
						.for("__webpack_module__")
						.tap(PLUGIN_NAME, (expr) => {
							/** @type {JavascriptModuleBuildInfo} */
							(parser.state.module.buildInfo).moduleConcatenationBailout =
								"__webpack_module__";
							const moduleArgument = parser.state.module.moduleArgument;
							if (moduleArgument === "__webpack_module__") {
								const dep = new RuntimeRequirementsDependency([
									RuntimeGlobals.module
								]);
								dep.loc = parser.getLocation(expr);
								parser.state.module.addPresentationalDependency(dep);
							} else {
								const initDep = new ModuleInitFragmentDependency(
									`var __webpack_internal_module__ = ${moduleArgument};\n`,
									[RuntimeGlobals.module],
									"__webpack_internal_module__"
								);
								parser.state.module.addPresentationalDependency(initDep);
								const dep = new ConstDependency(
									"__webpack_internal_module__",
									/** @type {Range} */ (expr.range),
									[]
								);
								dep.loc = parser.getLocation(expr);
								parser.state.module.addPresentationalDependency(dep);
							}
							return true;
						});
					parser.hooks.evaluateTypeof
						.for("__webpack_module__")
						.tap(PLUGIN_NAME, evaluateToString("object"));
				};

				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_AUTO)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_DYNAMIC)
					.tap(PLUGIN_NAME, handler);
				normalModuleFactory.hooks.parser
					.for(JAVASCRIPT_MODULE_TYPE_ESM)
					.tap(PLUGIN_NAME, handler);
			}
		);
	}
}

APIPlugin.runtimeUsesPublicPathOverride = runtimeUsesPublicPathOverride;
APIPlugin.usesRuntimePublicPathOverride = usesRuntimePublicPathOverride;

module.exports = APIPlugin;
