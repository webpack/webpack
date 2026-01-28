/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const { UsageState } = require("../ExportsInfo");
const ExternalModule = require("../ExternalModule");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const ConcatenatedModule = require("../optimize/ConcatenatedModule");
const propertyAccess = require("../util/propertyAccess");
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
 * @template T
 * @typedef {import("./AbstractLibraryPlugin").LibraryContext<T>} LibraryContext<T>
 */

/**
 * @typedef {object} ModuleLibraryPluginOptions
 * @property {LibraryType} type
 */

/**
 * @typedef {object} ModuleLibraryPluginParsed
 * @property {string} name
 * @property {LibraryExport=} export
 */

const PLUGIN_NAME = "ModuleLibraryPlugin";

/**
 * @typedef {ModuleLibraryPluginParsed} T
 * @extends {AbstractLibraryPlugin<ModuleLibraryPluginParsed>}
 */
class ModuleLibraryPlugin extends AbstractLibraryPlugin {
	/**
	 * @param {ModuleLibraryPluginOptions} options the plugin options
	 */
	constructor(options) {
		super({
			pluginName: "ModuleLibraryPlugin",
			type: options.type
		});
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		super.apply(compiler);

		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			const { onDemandExportsGeneration } =
				ConcatenatedModule.getCompilationHooks(compilation);
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
		});
	}

	/**
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
	 * @param {Source} source source
	 * @param {Module} module module
	 * @param {StartupRenderContext} renderContext render context
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {Source} source with library export
	 */
	renderStartup(
		source,
		module,
		{
			moduleGraph,
			chunk,
			codeGenerationResults,
			inlined,
			inlinedInIIFE,
			runtimeTemplate
		},
		{ options, compilation }
	) {
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

		const definitions =
			inlined && !inlinedInIIFE ? exportsFinalNameByRuntime : {};

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

		if (isAsync) {
			result.add(
				`${RuntimeGlobals.exports} = await ${RuntimeGlobals.exports};\n`
			);
		}

		outer: for (const exportInfo of exportInfos) {
			if (!exportInfo.provided) continue;

			const originalName = exportInfo.name;

			if (skipRenderDefaultExport && originalName === "default") continue;

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
				finalName = `${RuntimeGlobals.exports}${Template.toIdentifier(originalName)}`;
				result.add(
					`${runtimeTemplate.renderConst()} ${finalName} = ${RuntimeGlobals.exports}${propertyAccess(
						[usedName]
					)};\n`
				);
			}

			if (
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

		if (treatAsCommonJs) {
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

		return result;
	}

	/**
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
