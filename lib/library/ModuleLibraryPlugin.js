/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const ExternalStarReexportError = require("../errors/ExternalStarReexportError");
const ExternalModule = require("../externals/ExternalModule");
const { UsageState } = require("../graph/ExportsInfo");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");
const {
	getMergedExports,
	mergedEntryModules
} = require("../javascript/MergedEntryExports");
const { JAVASCRIPT_TYPE } = require("../module/ModuleSourceTypeConstants");
const ConcatenatedModule = require("../optimize/ConcatenatedModule");
const { InlinedUsedName } = require("../optimize/InlineExports");
const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const Template = require("../template/Template");
const { renameIdentifiers } = require("../util/concatenate");
const {
	RESERVED_IDENTIFIER,
	SAFE_IDENTIFIER,
	propertyAccess
} = require("../util/property");
const { getEntryRuntime } = require("../util/runtime");
const AbstractLibraryPlugin = require("./AbstractLibraryPlugin");

/** @import { Source } from "webpack-sources" */
/**
 * @import {
 * 	LibraryOptions,
 * 	LibraryType,
 * 	LibraryExport
 * } from "../../declarations/WebpackOptions"
 */
/** @import Chunk from "../graph/Chunk" */
/** @import CodeGenerationResults from "../module/CodeGenerationResults" */
/** @import Compilation from "../Compilation" */
/** @import Compiler from "../Compiler" */
/** @import ModuleGraph from "../graph/ModuleGraph" */
/** @import Module from "../module/Module" */
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
 * Whether the export name can also be used as the declared binding name.
 * @param {string} name export name
 * @returns {boolean} true, when the name can be declared
 */
const isDeclarableExportName = (name) =>
	SAFE_IDENTIFIER.test(name) && !RESERVED_IDENTIFIER.has(name);

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

		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const javascriptHooks =
				JavascriptModulesPlugin.getCompilationHooks(compilation);

			compilation.hooks.beforeCodeGeneration.tap(PLUGIN_NAME, () => {
				const entries = libraryEntryModules.get(compilation);
				if (entries === undefined) return;
				const { moduleGraph } = compilation;
				for (const { dependencies } of compilation.entries.values()) {
					for (const dep of dependencies) {
						const module = dep && moduleGraph.getModule(dep);
						if (!module) continue;
						const root =
							module instanceof ConcatenatedModule ? module.rootModule : module;
						if (!entries.has(root)) continue;
						if (root === module && noNativeExports(module, moduleGraph)) {
							continue;
						}
						moduleGraph.getMeta(module).onDemandExports = true;
					}
				}
			});

			// The stashed exports source is re-emitted only where the entry is wrapped;
			// inlined directly, the helpers it pulled in have no reader and can go.
			compilation.hooks.additionalChunkRuntimeRequirements.tap(
				PLUGIN_NAME,
				(chunk, set, { chunkGraph, codeGenerationResults }) => {
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

					// The helpers land in the runtime, not in this chunk, so what still
					// needs them is asked of every chunk sharing the entrypoint — the
					// runtime chunk, and whatever `splitChunks` moved out of the entry.
					/** @type {Set<Chunk>} */
					const siblings = new Set([chunk]);
					for (const [
						,
						entrypoint
					] of chunkGraph.getChunkEntryModulesWithChunkGroupIterable(chunk)) {
						if (!entrypoint) continue;
						for (const sibling of entrypoint.chunks) siblings.add(sibling);
					}

					let otherNeedsDefine = false;
					let otherNeedsNamespaceObject = false;
					let otherNeedsExports = false;
					let otherNeedsRequireScope = false;
					outer: for (const sibling of siblings) {
						for (const m of chunkGraph.getChunkModulesIterable(sibling)) {
							if (m === module) continue;
							const requirements = chunkGraph.getModuleRuntimeRequirements(
								m,
								sibling.runtime
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
							if (otherNeedsDefine) break outer;
						}
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
					!(dep instanceof HarmonyExportImportedSpecifierDependency) ||
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
				if (importedModule instanceof ExternalModule) {
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
					dep instanceof HarmonyExportImportedSpecifierDependency &&
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
						if (importedModule instanceof ExternalModule) {
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
				used instanceof InlinedUsedName
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
			runtimeTemplate
		} = renderContext;
		let result = new ConcatSource(source);
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

		if (isAsync) {
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
				target.module instanceof ExternalModule &&
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

			if (definition) {
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
			if (isDeclarableExportName(exportName)) {
				result.add(
					`export ${runtimeTemplate.renderConst()} ${exportName} = ${final};\n`
				);
				continue;
			}
			// Bind to a generated name, the export name can't be declared
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
