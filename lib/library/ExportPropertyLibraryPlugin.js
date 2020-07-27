/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const { UsageState } = require("../ExportsInfo");
const propertyAccess = require("../util/propertyAccess");
const { getEntryRuntime } = require("../util/runtime");
const AbstractLibraryPlugin = require("./AbstractLibraryPlugin");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("../../declarations/WebpackOptions").LibraryType} LibraryType */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../javascript/JavascriptModulesPlugin").RenderContext} RenderContext */
/** @template T @typedef {import("./AbstractLibraryPlugin").LibraryContext<T>} LibraryContext<T> */

/**
 * @typedef {Object} ExportPropertyLibraryPluginParsed
 * @property {string | string[]} export
 */

/**
 * @typedef {Object} ExportPropertyLibraryPluginOptions
 * @property {LibraryType} type
 * @property {boolean} nsObjectUsed the namespace object is used
 */
/**
 * @typedef {ExportPropertyLibraryPluginParsed} T
 * @extends {AbstractLibraryPlugin<ExportPropertyLibraryPluginParsed>}
 */
class ExportPropertyLibraryPlugin extends AbstractLibraryPlugin {
	/**
	 * @param {ExportPropertyLibraryPluginOptions} options options
	 */
	constructor({ type, nsObjectUsed }) {
		super({
			pluginName: "ExportPropertyLibraryPlugin",
			type
		});
		this.nsObjectUsed = nsObjectUsed;
	}

	/**
	 * @param {LibraryOptions} library normalized library option
	 * @returns {T | false} preprocess as needed by overriding
	 */
	parseOptions(library) {
		return {
			export: library.export
		};
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
			if (this.nsObjectUsed) {
				exportsInfo.setUsedInUnknownWay(runtime);
			} else {
				exportsInfo.setAllKnownExportsUsed(runtime);
			}
		}
		moduleGraph.addExtraReason(module, "used as library export");
	}
	/**
	 * @param {Source} source source
	 * @param {RenderContext} renderContext render context
	 * @param {LibraryContext<T>} libraryContext context
	 * @returns {Source} source with library export
	 */
	render(source, renderContext, { options }) {
		if (!options.export) return source;
		const postfix = propertyAccess(
			Array.isArray(options.export) ? options.export : [options.export]
		);
		return new ConcatSource(source, postfix);
	}
}

module.exports = ExportPropertyLibraryPlugin;
