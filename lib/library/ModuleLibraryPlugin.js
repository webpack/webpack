/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const { UsageState } = require("../ExportsInfo");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const ConcatenatedModule = require("../optimize/ConcatenatedModule");
const propertyAccess = require("../util/propertyAccess");
const { getEntryRuntime } = require("../util/runtime");
const AbstractLibraryPlugin = require("./AbstractLibraryPlugin");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions").LibraryType} LibraryType */
/** @typedef {import("../../declarations/WebpackOptions").LibraryExport} LibraryExport */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../Module").RuntimeRequirements} RuntimeRequirements */
/** @typedef {import("../javascript/JavascriptModulesPlugin").StartupRenderContext} StartupRenderContext */
/** @typedef {import("../javascript/JavascriptModulesPlugin").ModuleRenderContext} ModuleRenderContext */

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

					const exportsSourceByRuntime =
						buildMeta.exportsSourceByRuntime ||
						(buildMeta.exportsSourceByRuntime = new Map());

					const exportsFinalNameByRuntime =
						buildMeta.exportsFinalNameByRuntime ||
						(buildMeta.exportsFinalNameByRuntime = new Map());

					for (const runtime of runtimes) {
						exportsSourceByRuntime.set(runtime, source);
						exportsFinalNameByRuntime.set(runtime, finalName);
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
			// If the entry module is commonjs, its exports cannot be mangled
			if (module.buildMeta && module.buildMeta.treatAsCommonJs) {
				exportsInfo.setUsedInUnknownWay(runtime);
			} else {
				exportsInfo.setAllKnownExportsUsed(runtime);
			}
		}
		moduleGraph.addExtraReason(module, "used as library export");
	}

	/**
	 * @param {LibraryOptions} library normalized library option
	 * @returns {T | false} preprocess as needed by overriding
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
		const result = new ConcatSource(source);

		const exportsInfo = options.export
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
				module.buildMeta.exportsFinalNameByRuntime.get(chunk.runtime)) ||
			{};

		const definitions =
			inlined && !inlinedInIIFE ? exportsFinalNameByRuntime : {};

		/** @type {string[]} */
		const shortHandedExports = [];
		/** @type {[string, string][]} */
		const exports = [];
		const isAsync = moduleGraph.isAsync(module);

		const treatAsCommonJs =
			module.buildMeta && module.buildMeta.treatAsCommonJs;
		const skipRenderDefaultExport = Boolean(treatAsCommonJs);

		if (isAsync) {
			result.add(
				`${RuntimeGlobals.exports} = await ${RuntimeGlobals.exports};\n`
			);
		}

		outer: for (const exportInfo of exportsInfo) {
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
		}

		if (treatAsCommonJs) {
			shortHandedExports.push(`${RuntimeGlobals.exports} as default`);
		}

		if (shortHandedExports.length > 0) {
			result.add(`export { ${shortHandedExports.join(", ")} };\n`);
		}

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
			module.buildMeta.exportsSourceByRuntime.get(chunk.runtime);

		// Re-add the module's exports source when rendered in factory or as an inlined startup module wrapped in an IIFE
		if ((inlinedInIIFE || factory) && exportsSource) {
			return new ConcatSource(exportsSource, source);
		}
		return source;
	}
}

module.exports = ModuleLibraryPlugin;
