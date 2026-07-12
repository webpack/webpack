/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { UsageState } from "../ExportsInfo.js";
import * as RuntimeGlobals from "../RuntimeGlobals.js";
import { propertyAccess } from "../util/property.js";
import { getEntryRuntime } from "../util/runtime.js";
import { ConcatSource } from "../util/webpack-sources.js";
import AbstractLibraryPlugin from "./AbstractLibraryPlugin.js";

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions.js").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions.js").LibraryType} LibraryType */
/** @typedef {import("../../declarations/WebpackOptions.js").LibraryExport} LibraryExport */
/** @typedef {import("../Chunk.js").default} Chunk */
/** @typedef {import("../Module.js").default} Module */
/** @typedef {import("../Module.js").RuntimeRequirements} RuntimeRequirements */
/** @typedef {import("../javascript/JavascriptModulesPlugin.js").StartupRenderContext} StartupRenderContext */
/**
 * Defines the shared type used by this module.
 * @template T
 * @typedef {import("./AbstractLibraryPlugin.js").LibraryContext<T>} LibraryContext<T>
 */

/**
 * Defines the export property library plugin parsed type used by this module.
 * @typedef {object} ExportPropertyLibraryPluginParsed
 * @property {LibraryExport=} export
 */

/**
 * Defines the export property library plugin options type used by this module.
 * @typedef {object} ExportPropertyLibraryPluginOptions
 * @property {LibraryType} type
 */
/**
 * Represents the export property library plugin runtime component.
 * @typedef {ExportPropertyLibraryPluginParsed} T
 * @extends {AbstractLibraryPlugin<ExportPropertyLibraryPluginParsed>}
 */
class ExportPropertyLibraryPlugin extends AbstractLibraryPlugin {
	/**
	 * Creates an instance of ExportPropertyLibraryPlugin.
	 * @param {ExportPropertyLibraryPluginOptions} options options
	 */
	constructor({ type }) {
		super({
			pluginName: "ExportPropertyLibraryPlugin",
			type
		});
	}

	/**
	 * Returns preprocess as needed by overriding.
	 * @param {LibraryOptions} library normalized library option
	 * @returns {T} preprocess as needed by overriding
	 */
	parseOptions(library) {
		return {
			export: library.export
		};
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
			exportsInfo.setUsedInUnknownWay(runtime);
		}
		moduleGraph.addExtraReason(module, "used as library export");
	}

	/**
	 * Processes the provided chunk.
	 * @param {Chunk} chunk the chunk
	 * @param {RuntimeRequirements} set runtime requirements
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {void}
	 */
	runtimeRequirements(chunk, set, libraryContext) {
		set.add(RuntimeGlobals.exports);
	}

	/**
	 * Renders source with library export.
	 * @param {Source} source source
	 * @param {Module} module module
	 * @param {StartupRenderContext} renderContext render context
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {Source} source with library export
	 */
	renderStartup(source, module, renderContext, { options }) {
		if (!options.export) return source;
		const postfix = `${RuntimeGlobals.exports} = ${
			RuntimeGlobals.exports
		}${propertyAccess(
			Array.isArray(options.export) ? options.export : [options.export]
		)};\n`;
		return new ConcatSource(source, postfix);
	}
}

export default ExportPropertyLibraryPlugin;

export { ExportPropertyLibraryPlugin as "module.exports" };
