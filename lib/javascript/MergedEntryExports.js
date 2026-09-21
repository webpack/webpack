/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { JAVASCRIPT_TYPE } = require("../module/ModuleSourceTypeConstants");

/** @import { LibraryOptions } from "../../declarations/WebpackOptions" */
/**
 * @import {
 * 	OutputNormalizedWithDefaults as OutputOptions
 * } from "../config/defaults"
 */
/** @import Compilation from "../Compilation" */
/** @import Chunk from "../graph/Chunk" */
/** @import ChunkGraph from "../graph/ChunkGraph" */
/** @import { ExportInfo } from "../graph/ExportsInfo" */
/** @import ModuleGraph from "../graph/ModuleGraph" */
/** @import Module from "../module/Module" */
/** @import { RuntimeSpec } from "../util/runtime" */

/**
 * @typedef {object} MergedExport
 * @property {string} name the name the merged exports expose
 * @property {Module} module the entry module the name is read from
 * @property {string} usedName the name on that module's exports object
 */

/**
 * @typedef {object} MergedExports
 * @property {MergedExport[]} exports what the merged entry exposes, in entry order
 * @property {string[]} conflicting names more than one module binds differently
 * @property {Module[]} unknownExports entry modules that provide unknown exports
 * @property {boolean} namespace true when a merged module is an ES module
 */

/**
 * Whether the library options ask for the merged exports.
 * @param {LibraryOptions | undefined} library the library options, if any
 * @returns {boolean} true when they do
 */
const wantsMergedExports = (library) =>
	library !== undefined && library.entryExports === "all";

/** @type {WeakMap<Compilation, boolean>} */
const mergesByCompilation = new WeakMap();

/**
 * Whether anything in this compilation asks for merged entry exports, which a
 * build that never set the option answers without reading a chunk.
 * @param {Compilation} compilation the compilation
 * @returns {boolean} true when an entry or `output.library` opted in
 */
const compilationMergesEntryExports = (compilation) => {
	const cached = mergesByCompilation.get(compilation);
	if (cached !== undefined) return cached;
	let merges = wantsMergedExports(compilation.outputOptions.library);
	if (!merges) {
		for (const { options } of compilation.entries.values()) {
			if (wantsMergedExports(options.library)) {
				merges = true;
				break;
			}
		}
	}
	mergesByCompilation.set(compilation, merges);
	return merges;
};

/**
 * The library options in force for a chunk: its own entry's where it sets them,
 * and `output.library` otherwise.
 * @param {Chunk} chunk chunk
 * @param {OutputOptions} outputOptions the output options
 * @returns {LibraryOptions | undefined} the library options, if any
 */
const getLibraryOptions = (chunk, outputOptions) => {
	const entryOptions = chunk.getEntryOptions();
	return entryOptions && entryOptions.library !== undefined
		? entryOptions.library
		: outputOptions.library;
};

/**
 * The javascript entry modules a chunk merges the exports of, for a caller
 * that already resolved the library options in force for it.
 * @param {LibraryOptions | undefined} library the library options, if any
 * @param {Chunk} chunk chunk
 * @param {ChunkGraph} chunkGraph chunkGraph
 * @returns {Module[] | undefined} the entry modules to merge
 */
const mergedEntryModulesOfLibrary = (library, chunk, chunkGraph) => {
	if (!wantsMergedExports(library)) return undefined;
	/** @type {Module[]} */
	const modules = [];
	for (const module of chunkGraph.getChunkEntryModulesIterable(chunk)) {
		if (chunkGraph.getModuleSourceTypes(module).has(JAVASCRIPT_TYPE)) {
			modules.push(module);
		}
	}
	return modules.length > 1 ? modules : undefined;
};

/**
 * The javascript entry modules a chunk merges the exports of, or `undefined`
 * when it exports the last one alone — which is the default and the only shape
 * a single entry module can have.
 * @param {Chunk} chunk chunk
 * @param {ChunkGraph} chunkGraph chunkGraph
 * @param {Compilation} compilation the compilation
 * @returns {Module[] | undefined} the entry modules to merge
 */
const mergedEntryModules = (chunk, chunkGraph, compilation) =>
	compilationMergesEntryExports(compilation)
		? mergedEntryModulesOfLibrary(
				getLibraryOptions(chunk, compilation.outputOptions),
				chunk,
				chunkGraph
			)
		: undefined;

/**
 * Identifies the binding an export resolves to, so two modules re-exporting one
 * binding are told apart from two modules declaring the same name.
 * @param {InstanceType<ExportInfo>} exportInfo the export
 * @param {Module} module the module providing it
 * @param {ModuleGraph} moduleGraph the module graph
 * @returns {string} a key equal for the same binding and different otherwise
 */
const getBindingKey = (exportInfo, module, moduleGraph) => {
	const target = exportInfo.findTarget(moduleGraph, () => true);
	return target
		? JSON.stringify([target.module.identifier(), target.export])
		: JSON.stringify([module.identifier(), exportInfo.name]);
};

/**
 * What a merged entry exposes, following `export *`: a name more than one
 * module binds differently is left out, and the first provider of the rest wins.
 * @param {Module[]} modules the entry modules, in entry order
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {RuntimeSpec} runtime the chunk runtime
 * @returns {MergedExports} the merged exports
 */
const getMergedExports = (modules, moduleGraph, runtime) => {
	/** @type {Map<string, MergedExport>} */
	const byName = new Map();
	/** @type {Map<string, string>} */
	const bindings = new Map();
	/** @type {Set<string>} */
	const conflicting = new Set();
	/** @type {Module[]} */
	const unknownExports = [];
	let namespace = false;
	for (const module of modules) {
		const { buildMeta } = module;
		if (buildMeta && buildMeta.exportsType === "namespace") namespace = true;
		const exportsInfo = moduleGraph.getExportsInfo(module);
		// A module webpack cannot enumerate would need a runtime copy, which
		// would put names in the bundle that nothing can see.
		if (exportsInfo.otherExportsInfo.provided !== false) {
			unknownExports.push(module);
			continue;
		}
		for (const exportInfo of exportsInfo.orderedExports) {
			if (!exportInfo.provided) continue;
			const { name } = exportInfo;
			if (conflicting.has(name)) continue;
			const binding = getBindingKey(exportInfo, module, moduleGraph);
			const seen = bindings.get(name);
			if (seen !== undefined) {
				if (seen === binding) continue;
				conflicting.add(name);
				byName.delete(name);
				continue;
			}
			const usedName = exportInfo.getUsedName(name, runtime);
			if (typeof usedName !== "string") continue;
			bindings.set(name, binding);
			byName.set(name, { name, module, usedName });
		}
	}
	return {
		exports: [...byName.values()],
		conflicting: [...conflicting],
		unknownExports,
		namespace
	};
};

module.exports.compilationMergesEntryExports = compilationMergesEntryExports;
module.exports.getMergedExports = getMergedExports;
module.exports.mergedEntryModules = mergedEntryModules;
module.exports.mergedEntryModulesOfLibrary = mergedEntryModulesOfLibrary;
