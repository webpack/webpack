/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const ESMLiveExportDependency = require("../dependencies/esm/ESMLiveExportDependency");
const ESMLiveExportParserPlugin = require("../dependencies/esm/ESMLiveExportParserPlugin");
const ExternalStarReexportError = require("../errors/ExternalStarReexportError");
const { UsageState } = require("../graph/ExportsInfo");
const isDependencyKind = require("../graph/isDependencyKind");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");
const {
	getMergedExports,
	mergedEntryModules
} = require("../javascript/MergedEntryExports");
const { JAVASCRIPT_TYPE } = require("../module/ModuleSourceTypeConstants");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../module/ModuleTypeConstants");
const { isInlinedUsedName } = require("../optimize/InlineExports");
const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const Template = require("../template/Template");
const { someInIterable } = require("../util/IterableHelpers");
const { renameIdentifiers } = require("../util/concatenate");
const { SAFE_IDENTIFIER, propertyAccess } = require("../util/property");
const {
	getEntryRuntime,
	getRuntimeKey,
	intersectRuntime
} = require("../util/runtime");
const AbstractLibraryPlugin = require("./AbstractLibraryPlugin");

/** @import ExternalModule from "../externals/ExternalModule" */
/** @import { ExportInfo } from "../graph/ExportsInfo" */
/** @import Chunk from "../graph/Chunk" */
/** @import ESMExportSpecifierDependency from "../dependencies/esm/ESMExportSpecifierDependency" */
/** @import NormalModuleFactory from "../module/NormalModuleFactory" */
/** @import { InlinedUsedName } from "../optimize/InlineExports" */
/** @import { Source } from "webpack-sources" */
/**
 * @import {
 * 	LibraryOptions,
 * 	LibraryType,
 * 	LibraryExport
 * } from "../../declarations/WebpackOptions"
 */
/** @import CodeGenerationResults from "../module/CodeGenerationResults" */
/** @import Compilation from "../Compilation" */
/** @import Compiler from "../Compiler" */
/** @import ModuleGraph, { LiveBinding } from "../graph/ModuleGraph" */
/** @import Module from "../module/Module" */
/** @import ChunkGraph from "../graph/ChunkGraph" */
/** @import RuntimeTemplate from "../template/RuntimeTemplate" */
/**
 * @import {
 * 	StartupRenderContext,
 * 	ModuleRenderContext
 * } from "../javascript/JavascriptModulesPlugin"
 */
/** @import { RuntimeSpec } from "../util/runtime" */
/**
 * @import {
 * 	JavascriptModuleBuildMeta
 * } from "../javascript/JavascriptModule"
 */

/**
 * Defines the shared type used by this module.
 * @template T
 * @typedef {import("./AbstractLibraryPlugin").LibraryContext<T>} LibraryContext<T>
 */

/**
 * Defines the module library plugin options type used by this module.
 * @typedef {object} ModuleLibraryPluginOptions
 * @property {LibraryType} type
 */

/**
 * Defines the module library plugin parsed type used by this module.
 * @typedef {object} ModuleLibraryPluginParsed
 * @property {string} name
 * @property {LibraryExport=} export
 */

const PLUGIN_NAME = "ModuleLibraryPlugin";

/**
 * The entry modules this plugin renders `export { … }` for, per compilation — the
 * only ones whose export definitions may be taken over.
 * @type {WeakMap<Compilation, WeakSet<Module>>}
 */
const libraryEntryModules = new WeakMap();

/**
 * @typedef {object} ChunkLiveExports
 * @property {string[]} names the names the chunk's scope declares
 * @property {Map<InstanceType<ExportInfo>, string>} exports the name each live export binds to
 * @property {[string, string, string, string | false, boolean][]} setters the module id, local name, declared name, used export name and async status of each binding a module writes through a setter
 * @property {boolean} hasAsync whether any setter belongs to an async module
 */

/**
 * @typedef {object} LiveExportCandidate
 * @property {Module} module the module declaring the binding
 * @property {ESMLiveExportDependency} declaration its declaration
 * @property {InstanceType<ExportInfo>} exportInfo the library's export of it
 * @property {string} localName the local name the export binds to
 * @property {boolean} mirrored whether the module keeps its declaration and mirrors each write
 */

/** @type {WeakMap<Chunk, ChunkLiveExports>} */
const chunkLiveExports = new WeakMap();

/** @type {WeakSet<NormalModuleFactory>} */
const liveExportFactories = new WeakSet();

/** @type {WeakMap<Compilation, Set<string>>} */
const hoistedNames = new WeakMap();

/**
 * @typedef {object} ModuleLocalExports
 * @property {Map<string, ESMExportSpecifierDependency>} specifiers each local export by its name
 * @property {Map<string, ESMLiveExportDependency>} declarations each live `let` by a name it declares
 */

/**
 * Indexes the local exports and live `let` declarations of a module, once per module.
 * @param {Module} module the module
 * @param {Map<Module, ModuleLocalExports>} cache the indexes built so far
 * @returns {ModuleLocalExports} the module's index
 */
const getModuleLocalExports = (module, cache) => {
	let result = cache.get(module);
	if (result !== undefined) return result;
	result = { specifiers: new Map(), declarations: new Map() };
	for (const dependency of module.dependencies) {
		if (isDependencyKind(dependency, "esm-export-specifier")) {
			result.specifiers.set(dependency.name, dependency);
		} else if (isDependencyKind(dependency, "esm-live-export")) {
			for (const name of dependency.names) {
				result.declarations.set(name, dependency);
			}
		}
	}
	cache.set(module, result);
	return result;
};

/**
 * Why a module's exported module-level bindings cannot move to the chunk's scope.
 * @param {Module} module the module declaring them
 * @param {Module} entry the entry module exporting them
 * @param {ESMLiveExportDependency} declaration one of its declarations
 * @returns {string | null} the reason they stay and mirror, empty where they are live already, null where they can move
 */
const getHoistRefusal = (module, entry, declaration) => {
	// A concatenation puts its modules' bindings in one scope already.
	if (
		module.is("concatenated") ||
		(entry !== module &&
			someInIterable(entry.getSourceModules(), (source) => source === module))
	) {
		return "";
	}
	if (declaration.readByEval) {
		return "the module calls eval(), and a function it creates may write a binding later";
	}
	return null;
};

/**
 * Whether a module's code runs where the chunk's scope is not: in a hot update, or in
 * another chunk of the runtime, so it can reach the declared names only through setters.
 * @param {Module} module the module declaring them
 * @param {ESMLiveExportDependency} declaration one of its declarations
 * @param {Chunk} chunk the library's chunk
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @returns {boolean} true when the module needs the setters
 */
const needsSetters = (module, declaration, chunk, chunkGraph) =>
	declaration.hot ||
	!chunkGraph.isModuleInChunk(module, chunk) ||
	someInIterable(
		chunkGraph.getModuleChunksIterable(module),
		(other) =>
			other !== chunk &&
			intersectRuntime(other.runtime, chunk.runtime) !== undefined
	);

/**
 * Whether the library reads every export of the entry off its exports object, never
 * binding one to a declaration of the inlined body, so no definition can be left out.
 * @param {Module} module the entry module
 * @param {ModuleGraph} moduleGraph the module graph
 * @returns {boolean} true when the entry has no export the library exposes natively
 */
const noNativeExports = (module, moduleGraph) => {
	const buildMeta = /** @type {JavascriptModuleBuildMeta} */ (module.buildMeta);
	if (buildMeta && buildMeta.treatAsCommonJs) return true;
	// A top-level `await` wraps the body in `__webpack_require__.a`, and the
	// definitions read declarations inside that wrapper — re-emitting them after the
	// module would put them out of scope.
	return moduleGraph.isAsync(module);
};

/**
 * An export name is either an identifier name (reserved words included, e.g.
 * `default`) or a string literal (arbitrary module namespace names).
 * @param {string} name export name
 * @returns {string} name as it can be written after `as`
 */
const toExportName = (name) =>
	SAFE_IDENTIFIER.test(name) ? name : JSON.stringify(name);

/**
 * Represents the module library plugin runtime component.
 * @typedef {ModuleLibraryPluginParsed} T
 * @extends {AbstractLibraryPlugin<ModuleLibraryPluginParsed>}
 */
class ModuleLibraryPlugin extends AbstractLibraryPlugin {
	/**
	 * Creates an instance of ModuleLibraryPlugin.
	 * @param {ModuleLibraryPluginOptions} options the plugin options
	 */
	constructor(options) {
		super({
			pluginName: "ModuleLibraryPlugin",
			type: options.type
		});
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		super.apply(compiler);

		// Both library types apply this plugin, and one parser tap records everything.
		compiler.hooks.normalModuleFactory.tap(
			PLUGIN_NAME,
			(normalModuleFactory) => {
				if (liveExportFactories.has(normalModuleFactory)) return;
				liveExportFactories.add(normalModuleFactory);
				for (const type of [
					JAVASCRIPT_MODULE_TYPE_AUTO,
					JAVASCRIPT_MODULE_TYPE_ESM
				]) {
					normalModuleFactory.hooks.parser
						.for(type)
						.tap(PLUGIN_NAME, (parser) => {
							new ESMLiveExportParserPlugin().apply(parser);
						});
				}
			}
		);

		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const javascriptHooks =
				JavascriptModulesPlugin.getCompilationHooks(compilation);

			compilation.dependencyTemplates.set(
				ESMLiveExportDependency,
				new ESMLiveExportDependency.Template()
			);

			compilation.hooks.beforeCodeGeneration.tap(PLUGIN_NAME, () => {
				const entries = libraryEntryModules.get(compilation);
				if (entries === undefined) return;
				const { moduleGraph } = compilation;
				for (const { dependencies } of compilation.entries.values()) {
					for (const dep of dependencies) {
						const module = dep && moduleGraph.getModule(dep);
						if (!module) continue;
						const root = module.getRootModule();
						if (!entries.has(root)) continue;
						if (root === module && noNativeExports(module, moduleGraph)) {
							continue;
						}
						moduleGraph.getMeta(module).onDemandExports = true;
					}
				}
			});

			// An exported module-level `let` or `var` of a module the chunk runs as a function
			// moves to the chunk's scope under a reserved name, which the library then
			// exports itself; decided before hashing, as the module's code changes.
			compilation.hooks.beforeModuleHash.tap(PLUGIN_NAME, () => {
				const entries = libraryEntryModules.get(compilation);
				if (entries === undefined) return;
				const { chunkGraph, moduleGraph } = compilation;
				/** @type {Map<Module, ModuleLocalExports>} */
				const localExports = new Map();
				// Both library types name bindings in one compilation, so they share it.
				let usedNames = hoistedNames.get(compilation);
				if (usedNames === undefined) {
					usedNames = new Set();
					hoistedNames.set(compilation, usedNames);
				}
				/** @type {Map<Module, Set<string>>} */
				const registeredRuntimes = new Map();
				/** @type {{ chunk: Chunk, runtimeKey: string, candidates: LiveExportCandidate[] }[]} */
				const chunkCandidates = [];
				for (const chunk of compilation.chunks) {
					if (chunkGraph.getNumberOfEntryModules(chunk) === 0) continue;
					const entryOptions = chunk.getEntryOptions();
					const library =
						entryOptions && entryOptions.library !== undefined
							? entryOptions.library
							: compilation.outputOptions.library;
					if (this._parseOptionsCached(library) === false) continue;
					const runtimeKey = getRuntimeKey(chunk.runtime);
					/** @type {LiveExportCandidate[]} */
					const candidates = [];
					// why each module keeps its bindings, null where they move
					/** @type {Map<Module, string | null>} */
					const refusals = new Map();
					for (const entry of chunkGraph.getChunkEntryModulesIterable(chunk)) {
						if (!entries.has(entry.getRootModule())) continue;
						for (const exportInfo of moduleGraph.getExportsInfo(entry)
							.orderedExports) {
							if (!exportInfo.provided) continue;
							const target = exportInfo.getTarget(moduleGraph);
							if (target && (!target.export || target.export.length !== 1)) {
								continue;
							}
							const module = target ? target.module : entry;
							const { specifiers, declarations } = getModuleLocalExports(
								module,
								localExports
							);
							const local = specifiers.get(
								target
									? /** @type {string[]} */ (target.export)[0]
									: exportInfo.name
							);
							const declaration = local && declarations.get(local.id);
							if (!declaration) continue;
							let refusal = refusals.get(module);
							if (refusal === undefined) {
								refusal = getHoistRefusal(module, entry, declaration);
								refusals.set(module, refusal);
								if (refusal) {
									compilation.runtimeTemplate.analyzableBailout(
										module,
										`a module library may export a stale binding, since ${refusal}`
									);
								}
							}
							if (refusal === "") continue;
							candidates.push({
								module,
								declaration,
								exportInfo,
								localName: local.id,
								mirrored: declaration.earlyUse || refusal !== null
							});
							// A module runs once per runtime, so one library of it needing the
							// setters makes every library of that runtime register them.
							if (needsSetters(module, declaration, chunk, chunkGraph)) {
								let runtimes = registeredRuntimes.get(module);
								if (runtimes === undefined) {
									runtimes = new Set();
									registeredRuntimes.set(module, runtimes);
								}
								runtimes.add(runtimeKey);
							}
						}
					}
					if (candidates.length > 0) {
						chunkCandidates.push({ chunk, runtimeKey, candidates });
					}
				}
				for (const { chunk, runtimeKey, candidates } of chunkCandidates) {
					/** @type {string[]} */
					const names = [];
					/** @type {Set<LiveBinding>} */
					const declared = new Set();
					/** @type {ChunkLiveExports["exports"]} */
					const exports = new Map();
					/** @type {ChunkLiveExports["setters"]} */
					const setters = [];
					/** @type {Map<Module, { runtimeKeys: string[], usedExports: Map<string, string> }>} */
					const moduleRuntimeInfo = new Map();
					let hasAsync = false;
					for (const {
						module,
						declaration,
						exportInfo,
						localName,
						mirrored
					} of candidates) {
						const runtimes = registeredRuntimes.get(module);
						const registered =
							runtimes !== undefined && runtimes.has(runtimeKey);
						const isAsync = registered && moduleGraph.isAsync(module);
						const meta = moduleGraph.getMeta(module);
						// Renaming takes the module's own declaration, which an early use needs in
						// order to throw and eval() to read, so such a module mirrors each write.
						const bindings =
							registered || mirrored
								? meta.liveSetters || (meta.liveSetters = new Map())
								: meta.liveBindings || (meta.liveBindings = new Map());
						for (const name of declaration.names) {
							let binding = bindings.get(name);
							if (binding === undefined) {
								let hoisted = `__webpack_live_${name}__`;
								for (let i = 1; usedNames.has(hoisted); i++) {
									hoisted = `__webpack_live_${name}_${i}__`;
								}
								usedNames.add(hoisted);
								binding = {
									name: hoisted,
									runtimes: new Set(),
									registered: new Set()
								};
								bindings.set(name, binding);
							}
							if (declared.has(binding)) continue;
							declared.add(binding);
							binding.runtimes.add(runtimeKey);
							names.push(binding.name);
							if (!registered) continue;
							binding.registered.add(runtimeKey);
							let runtimeInfo = moduleRuntimeInfo.get(module);
							if (runtimeInfo === undefined) {
								runtimeInfo = { runtimeKeys: [], usedExports: new Map() };
								// Shared chunks generate the module for a union of runtimes;
								// guarded setters apply when any of them registers this binding.
								for (const runtime of chunkGraph.getModuleRuntimes(module)) {
									if (intersectRuntime(runtime, chunk.runtime) === undefined) {
										continue;
									}
									runtimeInfo.runtimeKeys.push(getRuntimeKey(runtime));
								}
								const exportsInfo = moduleGraph.getExportsInfo(module);
								for (const [exportName, specifier] of getModuleLocalExports(
									module,
									localExports
								).specifiers) {
									// A module that already ran seeds the binding from its first used alias.
									if (runtimeInfo.usedExports.has(specifier.id)) continue;
									const usedName = exportsInfo.getUsedName(
										exportName,
										chunk.runtime
									);
									if (typeof usedName === "string") {
										runtimeInfo.usedExports.set(specifier.id, usedName);
									}
								}
								moduleRuntimeInfo.set(module, runtimeInfo);
							}
							for (const key of runtimeInfo.runtimeKeys) {
								binding.runtimes.add(key);
								binding.registered.add(key);
							}
							const used = runtimeInfo.usedExports.get(name);
							hasAsync = hasAsync || isAsync;
							setters.push([
								JSON.stringify(chunkGraph.getModuleId(module)),
								name,
								binding.name,
								used === undefined ? false : used,
								isAsync
							]);
						}
						exports.set(
							exportInfo,
							/** @type {LiveBinding} */ (bindings.get(localName)).name
						);
					}
					if (names.length > 0) {
						chunkLiveExports.set(chunk, { names, exports, setters, hasAsync });
					}
				}
			});

			// The stashed exports source is re-emitted only where the entry is wrapped;
			// inlined directly, the helpers it pulled in have no reader and can go.
			compilation.hooks.additionalChunkRuntimeRequirements.tap(
				PLUGIN_NAME,
				(chunk, set) => {
					const live = chunkLiveExports.get(chunk);
					if (live && live.setters.length > 0) {
						set.add(RuntimeGlobals.moduleCache);
						if (live.hasAsync) {
							set.add(RuntimeGlobals.asyncModuleExportSymbol);
						}
					}
				}
			);

			compilation.hooks.additionalChunkRuntimeRequirements.tap(
				PLUGIN_NAME,
				(chunk, set, { chunkGraph, codeGenerationResults }) => {
					const { moduleGraph, runtimeTemplate } = compilation;
					if (!set.has(RuntimeGlobals.definePropertyGetters)) return;
					if (chunkGraph.getNumberOfEntryModules(chunk) !== 1) return;
					if (
						set.has(RuntimeGlobals.moduleFactories) ||
						set.has(RuntimeGlobals.moduleCache) ||
						set.has(RuntimeGlobals.interceptModuleExecution) ||
						set.has(RuntimeGlobals.module) ||
						set.has(RuntimeGlobals.thisAsExports)
					) {
						return;
					}
					if (javascriptHooks.inlineInRuntimeBailout.isUsed()) return;

					const [module] = chunkGraph.getChunkEntryModulesIterable(chunk);
					if (chunk.hasRuntime()) {
						// The startup inlines the entry only where nothing else loads with
						// it: another chunk of the entrypoint delays the execution, and a
						// module reading the entry needs it in the registry.
						for (const [
							,
							entrypoint
						] of chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)) {
							if (entrypoint && entrypoint.chunks.some((c) => c !== chunk)) {
								return;
							}
						}
						if (
							someInIterable(
								moduleGraph.getIncomingConnectionsByOriginModule(module),
								([originModule, connections]) =>
									originModule &&
									originModule !== module &&
									connections.some((c) => c.isTargetActive(chunk.runtime)) &&
									someInIterable(
										chunkGraph.getModuleRuntimes(originModule),
										(runtime) =>
											intersectRuntime(runtime, chunk.runtime) !== undefined
									)
							)
						) {
							return;
						}
					} else if (
						// A chunk whose runtime is elsewhere lifts its entry to the top
						// level under the same conditions, and renders it into the module
						// registry otherwise.
						JavascriptModulesPlugin._getEsmEntryModuleToInline({
							chunk,
							chunkGraph,
							moduleGraph,
							runtimeTemplate,
							codeGenerationResults
						}) !== module
					) {
						return;
					}
					const codeGenResult = codeGenerationResults.get(
						module,
						chunk.runtime
					);
					const { data } = codeGenResult;
					const takenOver =
						data !== undefined &&
						(data.has("exportsSource") || data.has("exportsBindingSource"));
					if (!takenOver) return;
					const jsSource = codeGenResult.sources.get("javascript");
					if (
						jsSource &&
						String(jsSource.source()).includes(`${RuntimeGlobals.require}.`)
					) {
						return;
					}

					// Without `avoidEntryIife`, another rendered module wraps the entry in
					// an IIFE, which re-emits the stashed source — its helpers stay.
					if (!compilation.options.optimization.avoidEntryIife) {
						for (const m of chunkGraph.getChunkModulesIterableBySourceType(
							chunk,
							JAVASCRIPT_TYPE
						) || []) {
							if (m !== module) return;
						}
					}

					// The entrypoint loads as this chunk alone, so what still needs the
					// helpers is whatever else it holds beside the entry.
					let otherNeedsDefine = false;
					let otherNeedsNamespaceObject = false;
					let otherNeedsExports = false;
					let otherNeedsRequireScope = false;
					for (const m of chunkGraph.getChunkModulesIterable(chunk)) {
						if (m === module) continue;
						const requirements = chunkGraph.getModuleRuntimeRequirements(
							m,
							chunk.runtime
						);
						if (!requirements) continue;
						if (requirements.has(RuntimeGlobals.definePropertyGetters)) {
							otherNeedsDefine = true;
						}
						if (requirements.has(RuntimeGlobals.makeNamespaceObject)) {
							otherNeedsNamespaceObject = true;
						}
						if (requirements.has(RuntimeGlobals.exports)) {
							otherNeedsExports = true;
						}
						if (requirements.has(RuntimeGlobals.requireScope)) {
							otherNeedsRequireScope = true;
						}
						if (otherNeedsDefine) break;
					}

					if (otherNeedsDefine) return;
					set.delete(RuntimeGlobals.definePropertyGetters);
					if (!otherNeedsNamespaceObject) {
						set.delete(RuntimeGlobals.makeNamespaceObject);
					}
					if (!otherNeedsExports) set.delete(RuntimeGlobals.exports);
					if (!otherNeedsRequireScope) set.delete(RuntimeGlobals.requireScope);
				}
			);
		});
	}

	/**
	 * Finish entry module.
	 * @param {Module} module the exporting entry module
	 * @param {string} entryName the name of the entrypoint
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {void}
	 */
	finishEntryModule(
		module,
		entryName,
		{ options, compilation, compilation: { moduleGraph } }
	) {
		const runtime = getEntryRuntime(compilation, entryName);
		if (options.export) {
			const exportsInfo = moduleGraph.getExportInfo(
				module,
				Array.isArray(options.export) ? options.export[0] : options.export
			);
			exportsInfo.setUsed(UsageState.Used, runtime);
			exportsInfo.canMangleUse = false;
			exportsInfo.canInlineUse = false;
		} else {
			const exportsInfo = moduleGraph.getExportsInfo(module);

			if (
				// If the entry module is commonjs, its exports cannot be mangled
				(module.buildMeta &&
					/** @type {JavascriptModuleBuildMeta} */ (module.buildMeta)
						.treatAsCommonJs) ||
				// The entry module provides unknown exports
				exportsInfo._otherExportsInfo.provided === null
			) {
				exportsInfo.setUsedInUnknownWay(runtime);
			} else {
				exportsInfo.setAllKnownExportsUsed(runtime);
				for (const exportInfo of exportsInfo.ownedExports) {
					exportInfo.canInlineUse = false;
				}
			}
		}
		this._checkStarReexportedExternals(module, compilation);
		moduleGraph.addExtraReason(module, "used as library export");
		let entries = libraryEntryModules.get(compilation);
		if (entries === undefined) {
			entries = new WeakSet();
			libraryEntryModules.set(compilation, entries);
		}
		entries.add(module);
	}

	/**
	 * Reports every external the entry star-reexports whose request names a property
	 * path, which `export *` has no way to reference.
	 * @param {Module} module the library entry module
	 * @param {Compilation} compilation the compilation
	 * @returns {void}
	 */
	_checkStarReexportedExternals(module, compilation) {
		const { moduleGraph } = compilation;
		/** @type {Set<Module>} */
		const visitedReexportModules = new Set([module]);
		/** @type {Module[]} */
		const queue = [module];
		/** @type {Set<ExternalModule>} */
		const unsupportedExternals = new Set();

		for (const current of queue) {
			for (const connection of moduleGraph.getOutgoingConnections(current)) {
				const dep = connection.dependency;

				// Only handle star-reexport statement
				if (
					dep === null ||
					!isDependencyKind(dep, "esm-reexport") ||
					dep.name !== null
				) {
					continue;
				}
				const importedModule = connection.resolvedModule;

				// Only a module providing unknown exports keeps its reexport rendered
				if (
					moduleGraph.getExportsInfo(importedModule)._otherExportsInfo
						.provided !== null
				) {
					continue;
				}
				if (importedModule.is("external")) {
					const request = importedModule.getResolvedRequest();
					if (Array.isArray(request) && request.length > 1) {
						unsupportedExternals.add(importedModule);
					}
				} else if (!visitedReexportModules.has(importedModule)) {
					visitedReexportModules.add(importedModule);
					queue.push(importedModule);
				}
			}
		}

		for (const externalModule of unsupportedExternals) {
			compilation.errors.push(
				new ExternalStarReexportError(externalModule, module)
			);
		}
	}

	/**
	 * Returns preprocess as needed by overriding.
	 * @param {LibraryOptions} library normalized library option
	 * @returns {T} preprocess as needed by overriding
	 */
	parseOptions(library) {
		const { name } = library;
		if (name) {
			throw new Error(
				`Library name must be unset. ${AbstractLibraryPlugin.COMMON_LIBRARY_NAME_MESSAGE}`
			);
		}
		const _name = /** @type {string} */ (name);
		return {
			name: _name,
			export: library.export
		};
	}

	/**
	 * Analyze unknown provided exports.
	 * @param {Source} source source
	 * @param {Module} module module
	 * @param {ModuleGraph} moduleGraph moduleGraph
	 * @param {RuntimeSpec} runtime chunk runtime
	 * @param {CodeGenerationResults} codeGenerationResults the code generation results
	 * @param {[string, string][]} exports exports
	 * @param {Set<string>} alreadyRenderedExports already rendered exports
	 * @returns {ConcatSource} source with null provided exports
	 */
	_analyzeUnknownProvidedExports(
		source,
		module,
		moduleGraph,
		runtime,
		codeGenerationResults,
		exports,
		alreadyRenderedExports
	) {
		const result = new ConcatSource(source);
		/** @type {Set<string>} */
		const externalReexports = new Set();
		/** @type {Map<string, string | InlinedUsedName>} */
		const unknownProvidedExports = new Map();
		/** @type {Set<Module>} */
		const visitedReexportModules = new Set();

		/**
		 * Resolves dynamic star reexport.
		 * @param {Module} module the module
		 * @param {boolean} isDynamicReexport if module is dynamic reexported
		 * @returns {void}
		 */
		const resolveDynamicStarReexport = (module, isDynamicReexport) => {
			for (const connection of moduleGraph.getOutgoingConnections(module)) {
				const dep = connection.dependency;

				// Only handle star-reexport statement
				if (
					dep !== null &&
					isDependencyKind(dep, "esm-reexport") &&
					dep.name === null
				) {
					const importedModule = connection.resolvedModule;
					const importedModuleExportsInfo =
						moduleGraph.getExportsInfo(importedModule);

					// The imported module provides unknown exports
					// So keep the reexports rendered in the bundle
					if (
						dep.getMode(moduleGraph, runtime).type === "dynamic-reexport" &&
						importedModuleExportsInfo._otherExportsInfo.provided === null
					) {
						// Handle export * from 'external'
						if (importedModule.is("external")) {
							const from = codeGenerationResults.has(importedModule, runtime)
								? codeGenerationResults.getData(
										importedModule,
										runtime,
										"externalReexport"
									)
								: undefined;
							if (from) externalReexports.add(`export * ${from};\n`);
						} else if (!visitedReexportModules.has(importedModule)) {
							visitedReexportModules.add(importedModule);
							resolveDynamicStarReexport(importedModule, true);
						}
					}
					// If importer modules existing `dynamic-reexport` dependency
					// We should keep export statement rendered in the bundle
					else if (isDynamicReexport) {
						for (const exportInfo of importedModuleExportsInfo.orderedExports) {
							if (!exportInfo.provided || exportInfo.name === "default") {
								continue;
							}
							const originalName = exportInfo.name;
							const usedName =
								/** @type {string | InlinedUsedName | false} */
								(exportInfo.getUsedName(originalName, runtime));

							if (!alreadyRenderedExports.has(originalName) && usedName) {
								unknownProvidedExports.set(originalName, usedName);
							}
						}
					}
				}
			}
		};

		resolveDynamicStarReexport(module, false);

		for (const reexport of externalReexports) {
			result.add(reexport);
		}

		for (const [origin, used] of unknownProvidedExports) {
			exports.push([
				origin,
				isInlinedUsedName(used)
					? used.render(
							Template.toNormalComment(
								`inlined export ${propertyAccess([origin])}`
							)
						)
					: `${RuntimeGlobals.exports}${propertyAccess([used])}`
			]);
		}

		return result;
	}

	/**
	 * Renders source with library export.
	 * @param {Source} source source
	 * @param {Module} module module
	 * @param {StartupRenderContext} renderContext render context
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {Source} source with library export
	 */
	renderStartup(source, module, renderContext, { options, compilation }) {
		const {
			moduleGraph,
			chunk,
			chunkGraph,
			codeGenerationResults,
			inlined,
			inlinedInIIFE,
			exportsAwaited,
			runtimeTemplate
		} = renderContext;
		const live = chunkLiveExports.get(chunk);
		// Declared before the startup runs the module functions assigning them
		let result = live
			? new ConcatSource(
					`${runtimeTemplate.renderLet()} ${live.names.join(", ")};\n`,
					this._renderLiveExportSetters(live, runtimeTemplate),
					source
				)
			: new ConcatSource(source);
		// A merged entry exposes what its modules expose together, so the ESM
		// export list is theirs rather than the last module's alone.
		const mergedModules = mergedEntryModules(chunk, chunkGraph, compilation);
		const exportedModules = mergedModules || [module];
		const exportInfos = options.export
			? [
					moduleGraph.getExportInfo(
						module,
						Array.isArray(options.export) ? options.export[0] : options.export
					)
				]
			: mergedModules
				? getMergedExports(
						mergedModules,
						moduleGraph,
						chunk.runtime
					).exports.map(({ name, module: from }) =>
						moduleGraph.getExportInfo(from, name)
					)
				: moduleGraph.getExportsInfo(module).orderedExports;

		const { data } = codeGenerationResults.get(module, chunk.runtime);

		const isInlinedEntryWithoutIIFE = inlined && !inlinedInIIFE;
		// The binding each export left out on demand reads, exported directly
		/** @type {Record<string, string>} */
		let definitions =
			(isInlinedEntryWithoutIIFE && data && data.get("exportsFinalName")) || {};
		// Inlined beside other modules, the entry's colliding declarations were renamed
		const { renamedDeclarations } = renderContext;
		if (renamedDeclarations) {
			/** @type {Record<string, string>} */
			const renamed = {};
			for (const usedName of Object.keys(definitions)) {
				renamed[usedName] = renameIdentifiers(
					definitions[usedName],
					renamedDeclarations
				);
			}
			definitions = renamed;
		}

		/** @type {string[]} */
		const shortHandedExports = [];
		/** @type {[string, string][]} */
		const exports = [];
		/** @type {Set<string>} */
		const alreadyRenderedExports = new Set();
		/** @type {Set<string>} */
		const usedLocalNames = new Set();

		/**
		 * `toIdentifier` is lossy, so distinct export names (`"a b"` and `"a-b"`)
		 * would otherwise be bound to the same generated name twice.
		 * @param {string} exportName export name
		 * @returns {string} unique local name for the export
		 */
		const toLocalName = (exportName) => {
			const base = `${RuntimeGlobals.exports}${Template.toIdentifier(exportName)}`;
			let name = base;
			let i = 0;
			while (usedLocalNames.has(name)) name = `${base}_${i++}`;
			usedLocalNames.add(name);
			return name;
		};

		// A merged entry is awaited in the bootstrap, so the object here is settled.
		const isAsync = !mergedModules && moduleGraph.isAsync(module);

		// One ES module among the merged ones still provides a real `default`, and
		// the synthetic one below would then be a second export of that name.
		const treatAsCommonJs = exportedModules.every((m) =>
			Boolean(
				m.buildMeta &&
				/** @type {JavascriptModuleBuildMeta} */ (m.buildMeta).treatAsCommonJs
			)
		);

		const moduleExportsInfo = moduleGraph.getExportsInfo(module);

		// Define ESM compatibility flag will rely on `__webpack_exports__`
		const needHarmonyCompatibilityFlag =
			moduleExportsInfo.otherExportsInfo.getUsed(chunk.runtime) !==
				UsageState.Unused ||
			moduleExportsInfo
				.getReadOnlyExportInfo("__esModule")
				.getUsed(chunk.runtime) !== UsageState.Unused;

		let needExportsDeclaration =
			!isInlinedEntryWithoutIIFE || isAsync || needHarmonyCompatibilityFlag;

		// The startup awaits the entry wherever top-level `await` reaches it.
		if (isAsync && !exportsAwaited) {
			result.add(
				`${RuntimeGlobals.exports} = await ${RuntimeGlobals.exports};\n`
			);
		}

		// Try to find all known exports of the entry module
		for (const exportInfo of exportInfos) {
			if (!exportInfo.provided) continue;

			const originalName = exportInfo.name;
			// Skip rendering the default export in some cases
			if (treatAsCommonJs && originalName === "default") continue;

			// Try to find all exports from the reexported modules
			const target = exportInfo.getTarget(moduleGraph);

			// A re-export is provided even when its target lacks the export, and
			// the path can end in a property access, so every name is looked up.
			if (
				target &&
				target.export &&
				target.export[target.export.length - 1] !== "default" &&
				moduleGraph
					.getExportsInfo(target.module)
					.isExportProvided(target.export) === false
			) {
				continue;
			}

			if (
				target &&
				target.module.is("external") &&
				target.export &&
				target.export.length === 1 &&
				codeGenerationResults.has(target.module, chunk.runtime)
			) {
				const reexport = codeGenerationResults.getData(
					target.module,
					chunk.runtime,
					"externalReexport"
				);
				if (reexport) {
					// The getter stays in the body, written into the object
					needExportsDeclaration = true;
					result.add(
						`export { ${toExportName(target.export[0])} as ${toExportName(originalName)} } ${reexport};\n`
					);
					alreadyRenderedExports.add(originalName);
					continue;
				}
			}

			// The exports of entry module are never inlined, and a merged exports
			// object is keyed by the original names rather than the mangled ones.
			const usedName = mergedModules
				? originalName
				: /** @type {string} */
					(exportInfo.getUsedName(originalName, chunk.runtime));
			/** @type {string | undefined} */
			const definition = definitions[usedName];
			/** @type {string | undefined} */
			let finalName;

			const liveName = live && live.exports.get(exportInfo);

			if (liveName) {
				finalName = liveName;
				// the body still defines an export it does not leave out on the object
				if (!definition) needExportsDeclaration = true;
			} else if (definition) {
				finalName = definition;
			} else {
				// Fallback to `__webpack_exports__` property access
				// when no direct export binding was found
				finalName = toLocalName(originalName);
				needExportsDeclaration = true;
				result.add(
					`${runtimeTemplate.renderConst()} ${finalName} = ${RuntimeGlobals.exports}${propertyAccess(
						[usedName]
					)};\n`
				);
			}

			if (
				// If the name includes `property access` and `call expressions`
				finalName &&
				(finalName.includes(".") ||
					finalName.includes("[") ||
					finalName.includes("("))
			) {
				if (exportInfo.isReexport()) {
					const topLevelDeclarations =
						(data && data.get("topLevelDeclarations")) ||
						(module.buildInfo && module.buildInfo.topLevelDeclarations);

					if (topLevelDeclarations && topLevelDeclarations.has(originalName)) {
						const name = toLocalName(originalName);
						result.add(
							`${runtimeTemplate.renderConst()} ${name} = ${finalName};\n`
						);
						shortHandedExports.push(`${name} as ${toExportName(originalName)}`);
					} else {
						exports.push([originalName, finalName]);
					}
				} else {
					exports.push([originalName, finalName]);
				}
			} else {
				shortHandedExports.push(
					finalName === originalName
						? finalName
						: `${finalName} as ${toExportName(originalName)}`
				);
			}

			alreadyRenderedExports.add(originalName);
		}

		if (shortHandedExports.length > 0) {
			result.add(`export { ${shortHandedExports.join(", ")} };\n`);
		}

		// Add default export `__webpack_exports__` statement to keep better compatibility
		if (treatAsCommonJs) {
			needExportsDeclaration = true;
			result.add(`export default ${RuntimeGlobals.exports};\n`);
		}

		result = this._analyzeUnknownProvidedExports(
			result,
			module,
			moduleGraph,
			chunk.runtime,
			codeGenerationResults,
			exports,
			alreadyRenderedExports
		);

		for (const [exportName, final] of exports) {
			// A declaration under the export's own name would shadow a global of that
			// name every module of the chunk may read, so a generated name binds it.
			const name = toLocalName(exportName);
			result.add(
				`${runtimeTemplate.renderConst()} ${name} = ${final};\nexport { ${name} as ${toExportName(exportName)} };\n`
			);
		}

		if (!needExportsDeclaration) {
			renderContext.needExportsDeclaration = false;
		}

		return result;
	}

	/**
	 * Renders the setters through which hot modules, an update included, write the
	 * bindings the chunk's scope declares; a list per name, as several libraries may.
	 * A module that ran before the chunk loaded hands over its value through its exports.
	 * @param {ChunkLiveExports} live the chunk's live bindings
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @returns {string} the registrations
	 */
	_renderLiveExportSetters({ setters, hasAsync }, runtimeTemplate) {
		if (setters.length === 0) return "";
		const exports = hasAsync
			? `(isAsync ? module.exports[${RuntimeGlobals.asyncModuleExportSymbol}] : module.exports)`
			: "module.exports";
		const register = "__webpack_live_register__";
		return Template.asString([
			`var ${register} = ${runtimeTemplate.basicFunction(
				hasAsync ? "id, name, set, key, isAsync" : "id, name, set, key",
				[
					`var setters = ${RuntimeGlobals.liveExportSetters} = ${RuntimeGlobals.liveExportSetters} || {};`,
					"setters = setters[id] = setters[id] || {};",
					"(setters[name] = setters[name] || []).push(set);",
					`var module = ${RuntimeGlobals.moduleCache}[id];`,
					// A module still before its declaration throws, and hands the value over later.
					`if (module && key) try { set(${exports}[key]); } catch (e) {}`
				]
			)};`,
			...setters.map(
				([id, name, hoisted, used, isAsync]) =>
					`${register}(${id}, ${JSON.stringify(name)}, ${runtimeTemplate.basicFunction(
						"value",
						`${hoisted} = value;`
					)}${used ? `, ${JSON.stringify(used)}${isAsync ? ", 1" : ""}` : ""});`
			),
			""
		]);
	}

	/**
	 * Renders module content.
	 * @param {Source} source source
	 * @param {Module} module module
	 * @param {ModuleRenderContext} renderContext render context
	 * @param {Omit<LibraryContext<T>, "options">} libraryContext context
	 * @returns {Source} source with library export
	 */
	renderModuleContent(
		source,
		module,
		{ factory, inlinedInIIFE, chunk, codeGenerationResults },
		libraryContext
	) {
		const { data } = codeGenerationResults.get(module, chunk.runtime);
		if (data === undefined) return source;
		const exportsSource = data.get("exportsSource");
		const bindingSource = data.get("exportsBindingSource");

		// Re-add the exports source in a factory or IIFE-wrapped startup module; value
		// bindings read the declarations above them, so those go after the body.
		if ((inlinedInIIFE || factory) && (exportsSource || bindingSource)) {
			return new ConcatSource(
				...(exportsSource ? [exportsSource] : []),
				source,
				...(bindingSource ? ["\n", bindingSource] : [])
			);
		}
		return source;
	}
}

module.exports = ModuleLibraryPlugin;
