/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const { UsageState } = require("../ExportsInfo");
const ExternalModule = require("../ExternalModule");
const RuntimeGlobals = require("../RuntimeGlobals");
const { GLOBALS_ON_REQUIRE } = require("../RuntimePlugin");
const Template = require("../Template");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");
const ConcatenatedModule = require("../optimize/ConcatenatedModule");
const { propertyAccess } = require("../util/property");
const { getEntryRuntime, getRuntimeKey } = require("../util/runtime");
const AbstractLibraryPlugin = require("./AbstractLibraryPlugin");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions").LibraryType} LibraryType */
/** @typedef {import("../../declarations/WebpackOptions").LibraryExport} LibraryExport */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../Module").RuntimeRequirements} RuntimeRequirements */
/** @typedef {import("../javascript/JavascriptModulesPlugin").StartupRenderContext} StartupRenderContext */
/** @typedef {import("../javascript/JavascriptModulesPlugin").ModuleRenderContext} ModuleRenderContext */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

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
			const { onDemandExportsGeneration } =
				ConcatenatedModule.getCompilationHooks(compilation);
			const javascriptHooks =
				JavascriptModulesPlugin.getCompilationHooks(compilation);
			onDemandExportsGeneration.tap(
				PLUGIN_NAME,
				(module, runtimes, source, finalName) => {
					/** @type {BuildMeta} */
					const buildMeta = module.buildMeta || (module.buildMeta = {});

					/** @type {BuildMeta["exportsSourceByRuntime"]} */
					const exportsSourceByRuntime =
						buildMeta.exportsSourceByRuntime ||
						(buildMeta.exportsSourceByRuntime = new Map());

					/** @type {BuildMeta["exportsFinalNameByRuntime"]} */
					const exportsFinalNameByRuntime =
						buildMeta.exportsFinalNameByRuntime ||
						(buildMeta.exportsFinalNameByRuntime = new Map());

					for (const runtime of runtimes) {
						const key = getRuntimeKey(runtime);
						exportsSourceByRuntime.set(key, source);
						exportsFinalNameByRuntime.set(key, finalName);
					}

					return true;
				}
			);

			// The on-demand exports source `__webpack_require__.d(...)` is only
			// re-emitted by `renderModuleContent` when the module is rendered
			// as a factory or wrapped in an IIFE. For an inlined entry without
			// IIFE the source is dropped, and any runtime requirements that
			// were added solely because of that source become unused. Drop
			// `definePropertyGetters`, `exports`, and the chained
			// `requireScope` from the chunk's set when no module in the chunk
			// actually uses them after the on-demand source is removed.
			compilation.hooks.additionalChunkRuntimeRequirements.tap(
				PLUGIN_NAME,
				(chunk, set, { chunkGraph, codeGenerationResults }) => {
					if (
						!set.has(RuntimeGlobals.definePropertyGetters) &&
						!set.has(RuntimeGlobals.exports)
					) {
						return;
					}
					// `inlineInRuntimeBailout` may turn an otherwise inlineable
					// entry into a factory rendering at render-time; we can't
					// inspect its return value here so conservatively keep the
					// requirements when something tapped the hook.
					const mayBailoutInline =
						javascriptHooks.inlineInRuntimeBailout.isUsed();

					let definePropertyGettersUsed = false;
					let exportsUsed = false;
					let otherRequireScopeUser = false;

					for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
						const moduleRequirements = chunkGraph.getModuleRuntimeRequirements(
							module,
							chunk.runtime
						);
						const hasD = moduleRequirements.has(
							RuntimeGlobals.definePropertyGetters
						);
						const hasE = moduleRequirements.has(RuntimeGlobals.exports);
						if (!hasD && !hasE) {
							if (
								ModuleLibraryPlugin._moduleUsesRequireScope(moduleRequirements)
							) {
								otherRequireScopeUser = true;
							}
							continue;
						}
						const exportsSourceByRuntime =
							module.buildMeta && module.buildMeta.exportsSourceByRuntime;
						const hasOnDemandSource = Boolean(
							exportsSourceByRuntime &&
							exportsSourceByRuntime.has(getRuntimeKey(chunk.runtime))
						);
						const willReAdd =
							hasOnDemandSource &&
							(mayBailoutInline ||
								ModuleLibraryPlugin._willOnDemandExportsBeReAdded(
									module,
									chunk,
									chunkGraph,
									set,
									moduleRequirements
								));

						if (!hasOnDemandSource || willReAdd) {
							if (hasD) definePropertyGettersUsed = true;
							if (hasE) exportsUsed = true;
						} else {
							// Source dropped. The requirements added during code
							// generation are only "real" if some other producer
							// (namespace objects, harmony flag, deferred external,
							// ...) put a `.d`/`__webpack_exports__` reference into
							// the module's emitted source. ConcatenatedModule
							// records that via `codeGenerationResults` data so we
							// can avoid scanning the source string.
							const codeGenResult =
								codeGenerationResults.has(module, chunk.runtime) &&
								codeGenerationResults.get(module, chunk.runtime);
							const data = codeGenResult ? codeGenResult.data : undefined;
							const onlyOnDemandD =
								data && data.get("onDemandIsOnlyDefinePropertyGettersReason");
							const onlyOnDemandE =
								data && data.get("onDemandIsOnlyExportsReason");
							if (hasD && !onlyOnDemandD) {
								definePropertyGettersUsed = true;
							}
							if (hasE && !onlyOnDemandE) {
								exportsUsed = true;
							}
						}
						if (
							ModuleLibraryPlugin._moduleUsesRequireScope(moduleRequirements, [
								RuntimeGlobals.definePropertyGetters,
								RuntimeGlobals.exports
							])
						) {
							otherRequireScopeUser = true;
						}
					}

					if (!definePropertyGettersUsed) {
						set.delete(RuntimeGlobals.definePropertyGetters);
					}
					if (!exportsUsed) {
						set.delete(RuntimeGlobals.exports);
					}
					// `requireScope` is added at module level by `RuntimePlugin` for
					// every `GLOBALS_ON_REQUIRE` member. Once the only members in the
					// chunk's set are removed, no producer remains, so drop the
					// chained `requireScope` to avoid emitting an empty require scope.
					if (
						!definePropertyGettersUsed &&
						!exportsUsed &&
						!otherRequireScopeUser
					) {
						set.delete(RuntimeGlobals.requireScope);
					}
				}
			);
		});
	}

	/**
	 * Predicts whether the on-demand exports source for `module` will be
	 * re-emitted into `chunk` during rendering. The source is re-added when
	 * the module is rendered as a factory (e.g. a non-entry chunk module, or
	 * any module when inline startup is disabled) or when an entry module
	 * gets wrapped in an IIFE because the chunk has additional modules that
	 * need isolation.
	 * @param {Module} module the module
	 * @param {Chunk} chunk the chunk
	 * @param {import("../ChunkGraph")} chunkGraph the chunk graph
	 * @param {Set<string>} chunkRequirements the chunk's runtime requirements
	 * @param {ReadonlySet<string>} moduleRequirements the module's runtime requirements
	 * @returns {boolean} true when the on-demand source will be in the output
	 */
	static _willOnDemandExportsBeReAdded(
		module,
		chunk,
		chunkGraph,
		chunkRequirements,
		moduleRequirements
	) {
		// non-entry modules of the chunk are always rendered with `factory: true`
		if (!chunkGraph.isEntryModuleInChunk(module, chunk)) {
			return true;
		}
		// chunks with multiple entry modules wrap each in an IIFE
		if (chunkGraph.getNumberOfEntryModules(chunk) > 1) {
			return true;
		}
		// chunks containing additional non-entry modules wrap entries in an IIFE
		if (
			chunkGraph.getNumberOfChunkModules(chunk) >
			chunkGraph.getNumberOfEntryModules(chunk)
		) {
			return true;
		}
		// chunks with sibling entry chunks (e.g. a separate runtime chunk) lose
		// inline startup, which forces the module through the factory path
		if (chunkGraph.hasChunkEntryDependentChunks(chunk)) {
			return true;
		}
		// chunk-level runtime requirements that disable inline startup
		if (
			chunkRequirements.has(RuntimeGlobals.moduleFactories) ||
			chunkRequirements.has(RuntimeGlobals.moduleCache) ||
			chunkRequirements.has(RuntimeGlobals.interceptModuleExecution)
		) {
			return true;
		}
		// module-level runtime requirements that disable inline startup
		if (
			moduleRequirements.has(RuntimeGlobals.module) ||
			moduleRequirements.has(RuntimeGlobals.thisAsExports)
		) {
			return true;
		}
		return false;
	}

	/**
	 * Checks whether the module's runtime requirements include any global that
	 * `RuntimePlugin` chains to `requireScope`, optionally ignoring some
	 * globals whose contribution is being removed.
	 * @param {ReadonlySet<string>} moduleRequirements the module's runtime requirements
	 * @param {string[]=} ignored globals to treat as not requiring `requireScope`
	 * @returns {boolean} true when another global keeps `requireScope` alive
	 */
	static _moduleUsesRequireScope(moduleRequirements, ignored) {
		for (const req of GLOBALS_ON_REQUIRE) {
			if (ignored && ignored.includes(req)) continue;
			if (moduleRequirements.has(req)) return true;
		}
		return false;
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
		} else {
			const exportsInfo = moduleGraph.getExportsInfo(module);

			if (
				// If the entry module is commonjs, its exports cannot be mangled
				(module.buildMeta && module.buildMeta.treatAsCommonJs) ||
				// The entry module provides unknown exports
				exportsInfo._otherExportsInfo.provided === null
			) {
				exportsInfo.setUsedInUnknownWay(runtime);
			} else {
				exportsInfo.setAllKnownExportsUsed(runtime);
			}
		}
		moduleGraph.addExtraReason(module, "used as library export");
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
	 * @param {[string, string][]} exports exports
	 * @param {Set<string>} alreadyRenderedExports already rendered exports
	 * @returns {ConcatSource} source with null provided exports
	 */
	_analyzeUnknownProvidedExports(
		source,
		module,
		moduleGraph,
		runtime,
		exports,
		alreadyRenderedExports
	) {
		const result = new ConcatSource(source);
		/** @type {Set<string>} */
		const moduleRequests = new Set();
		/** @type {Map<string, string>} */
		const unknownProvidedExports = new Map();

		/**
		 * Resolves dynamic star reexport.
		 * @param {Module} module the module
		 * @param {boolean} isDynamicReexport if module is dynamic reexported
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
							moduleRequests.add(importedModule.userRequest);
						} else {
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
							const usedName = exportInfo.getUsedName(originalName, runtime);

							if (!alreadyRenderedExports.has(originalName) && usedName) {
								unknownProvidedExports.set(originalName, usedName);
							}
						}
					}
				}
			}
		};

		resolveDynamicStarReexport(module, false);

		for (const request of moduleRequests) {
			result.add(`export * from "${request}";\n`);
		}

		for (const [origin, used] of unknownProvidedExports) {
			exports.push([
				origin,
				`${RuntimeGlobals.exports}${propertyAccess([used])}`
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
			codeGenerationResults,
			inlined,
			inlinedInIIFE,
			runtimeTemplate
		} = renderContext;
		let result = new ConcatSource(source);
		const exportInfos = options.export
			? [
					moduleGraph.getExportInfo(
						module,
						Array.isArray(options.export) ? options.export[0] : options.export
					)
				]
			: moduleGraph.getExportsInfo(module).orderedExports;

		const exportsFinalNameByRuntime =
			(module.buildMeta &&
				module.buildMeta.exportsFinalNameByRuntime &&
				module.buildMeta.exportsFinalNameByRuntime.get(
					getRuntimeKey(chunk.runtime)
				)) ||
			{};

		const isInlinedEntryWithoutIIFE = inlined && !inlinedInIIFE;
		// Direct export bindings from on-demand concatenation
		const definitions = isInlinedEntryWithoutIIFE
			? exportsFinalNameByRuntime
			: {};

		/** @type {string[]} */
		const shortHandedExports = [];
		/** @type {[string, string][]} */
		const exports = [];
		/** @type {Set<string>} */
		const alreadyRenderedExports = new Set();

		const isAsync = moduleGraph.isAsync(module);

		const treatAsCommonJs =
			module.buildMeta && module.buildMeta.treatAsCommonJs;
		const skipRenderDefaultExport = Boolean(treatAsCommonJs);

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
		outer: for (const exportInfo of exportInfos) {
			if (!exportInfo.provided) continue;

			const originalName = exportInfo.name;
			// Skip rendering the default export in some cases
			if (skipRenderDefaultExport && originalName === "default") continue;

			// Try to find all exports from the reexported modules
			const target = exportInfo.findTarget(moduleGraph, (_m) => true);
			if (target) {
				const reexportsInfo = moduleGraph.getExportsInfo(target.module);
				for (const reexportInfo of reexportsInfo.orderedExports) {
					if (
						reexportInfo.provided === false &&
						reexportInfo.name !== "default" &&
						reexportInfo.name === /** @type {string[]} */ (target.export)[0]
					) {
						continue outer;
					}
				}
			}

			const usedName =
				/** @type {string} */
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
				finalName = `${RuntimeGlobals.exports}${Template.toIdentifier(originalName)}`;
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
					const { data } = codeGenerationResults.get(module, chunk.runtime);
					const topLevelDeclarations =
						(data && data.get("topLevelDeclarations")) ||
						(module.buildInfo && module.buildInfo.topLevelDeclarations);

					if (topLevelDeclarations && topLevelDeclarations.has(originalName)) {
						const name = `${RuntimeGlobals.exports}${Template.toIdentifier(originalName)}`;
						result.add(
							`${runtimeTemplate.renderConst()} ${name} = ${finalName};\n`
						);
						shortHandedExports.push(`${name} as ${originalName}`);
					} else {
						exports.push([originalName, finalName]);
					}
				} else {
					exports.push([originalName, finalName]);
				}
			} else {
				shortHandedExports.push(
					definition && finalName === originalName
						? finalName
						: `${finalName} as ${originalName}`
				);
			}

			alreadyRenderedExports.add(originalName);
		}

		// Add default export `__webpack_exports__` statement to keep better compatibility
		if (treatAsCommonJs) {
			needExportsDeclaration = true;
			shortHandedExports.push(`${RuntimeGlobals.exports} as default`);
		}

		if (shortHandedExports.length > 0) {
			result.add(`export { ${shortHandedExports.join(", ")} };\n`);
		}

		result = this._analyzeUnknownProvidedExports(
			result,
			module,
			moduleGraph,
			chunk.runtime,
			exports,
			alreadyRenderedExports
		);

		for (const [exportName, final] of exports) {
			result.add(
				`export ${runtimeTemplate.renderConst()} ${exportName} = ${final};\n`
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
		{ factory, inlinedInIIFE, chunk },
		libraryContext
	) {
		const exportsSource =
			module.buildMeta &&
			module.buildMeta.exportsSourceByRuntime &&
			module.buildMeta.exportsSourceByRuntime.get(getRuntimeKey(chunk.runtime));

		// Re-add the module's exports source when rendered in factory
		// or as an inlined startup module wrapped in an IIFE
		if ((inlinedInIIFE || factory) && exportsSource) {
			return new ConcatSource(exportsSource, source);
		}
		return source;
	}
}

module.exports = ModuleLibraryPlugin;
