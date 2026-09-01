/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Compilation = require("./Compilation");
const HotUpdateChunk = require("./HotUpdateChunk");
const NormalModule = require("./NormalModule");
const CssModulesPlugin = require("./css/CssModulesPlugin");
const ConcatenatedModule = require("./optimize/ConcatenatedModule");
const { first } = require("./util/SetHelpers");
const { makePathsRelative } = require("./util/identifier");

/** @typedef {import("../declarations/plugins/SSRManifestPlugin").SSRManifestPluginOptions} SSRManifestPluginOptions */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleGraph")} ModuleGraph */

const PLUGIN_NAME = "SSRManifestPlugin";
const DEFAULT_FILENAME = "ssr-manifest.json";

// A stylesheet among a chunk's output files.
const CSS_FILE_REGEXP = /\.css$/i;

/**
 * Yields the underlying source modules of a chunk module (unwrapping concatenation).
 * @param {Module} module a module contained in a chunk
 * @returns {Iterable<Module>} the source modules
 */
const sourceModules = (module) =>
	module instanceof ConcatenatedModule ? module.modules : [module];

/**
 * Whether two chunks are fetched together, i.e. one is a split-out part of the
 * other rather than something it lazily loads later.
 * @param {Chunk} a a chunk
 * @param {Chunk} b another chunk
 * @returns {boolean} true when both belong to a common chunk group
 */
const areLoadedTogether = (a, b) => {
	for (const group of a.groupsIterable) {
		if (b.isInGroup(group)) return true;
	}
	return false;
};

/**
 * Reduces the module graph to edges between chunks fetched together, walking
 * each module's connections once rather than once per chunk containing it.
 * @param {Iterable<Module>} modules the compilation's modules
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {ModuleGraph} moduleGraph the module graph
 * @returns {Map<Chunk, Set<Chunk>>} the chunks each chunk depends on
 */
const getChunkDependencies = (modules, chunkGraph, moduleGraph) => {
	/** @type {Map<Chunk, Set<Chunk>>} */
	const dependencies = new Map();
	/** @type {Set<Chunk>} */
	const targets = new Set();

	for (const module of modules) {
		targets.clear();
		for (const connection of moduleGraph.getOutgoingConnections(module)) {
			const dependency = connection.module;
			if (dependency === null) continue;
			for (const target of chunkGraph.getModuleChunksIterable(dependency)) {
				targets.add(target);
			}
		}
		if (targets.size === 0) continue;

		for (const chunk of chunkGraph.getModuleChunksIterable(module)) {
			/** @type {Set<Chunk> | undefined} */
			let edges;
			for (const target of targets) {
				if (target === chunk) continue;
				if (!areLoadedTogether(target, chunk)) continue;
				if (edges === undefined) {
					edges = dependencies.get(chunk);
					if (edges === undefined) dependencies.set(chunk, (edges = new Set()));
				}
				edges.add(target);
			}
		}
	}

	return dependencies;
};

/**
 * Collects the chunks the browser needs before a chunk's modules can run: the
 * split-out chunks it depends on, and any async ancestor it is reached through.
 * Without them a consumer preloading a rendered module would still waterfall.
 * Only follows dependencies, never importers, so a shared chunk does not drag
 * in the routes that happen to use it.
 * @param {Chunk} chunk the chunk a rendered module lives in
 * @param {Map<Chunk, Set<Chunk>>} dependencies the precomputed chunk edges
 * @returns {Set<Chunk>} the chunks to list for that module
 */
const getRequiredChunks = (chunk, dependencies) => {
	/** @type {Set<Chunk>} */
	const chunks = new Set([chunk]);

	for (const current of chunks) {
		const edges = dependencies.get(current);
		if (edges === undefined) continue;
		for (const target of edges) chunks.add(target);
	}

	/** @type {Set<ChunkGroup>} */
	const ancestors = new Set(chunk.groupsIterable);
	for (const group of ancestors) {
		for (const parent of group.parentsIterable) {
			// initial chunks are served with the document, so they need no preload
			if (parent.isInitial()) continue;
			for (const parentChunk of parent.chunks) chunks.add(parentChunk);
			ancestors.add(parent);
		}
	}

	return chunks;
};

/**
 * The required chunks with the stylesheet-carrying ones first, in the order
 * their rules cascade — the rest keep theirs, because a preload does not care.
 * The cascade is read from the group the rendered module is reached through,
 * the same rule the extracted HTML writes its `<link>` tags with.
 * @param {Set<Chunk>} required the chunks a rendered module needs
 * @param {Chunk} chunk the chunk the module lives in
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @returns {Iterable<Chunk>} the chunks, stylesheet-carrying ones first
 */
const orderByCascade = (required, chunk, chunkGraph) => {
	const group = first(chunk.groupsIterable);
	if (group === undefined) return required;
	const stylesheets = CssModulesPlugin.getCssChunksInCascadeOrder(
		required,
		group,
		chunkGraph
	);
	if (stylesheets.length < 2) return required;
	const ordered = new Set(stylesheets);
	for (const other of required) ordered.add(other);
	return ordered;
};

class SSRManifestPlugin {
	/**
	 * Creates an instance of SSRManifestPlugin.
	 * @param {SSRManifestPluginOptions=} options options
	 */
	constructor(options = {}) {
		/** @type {SSRManifestPluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.validate.tap(PLUGIN_NAME, () => {
			compiler.validate(
				() => require("../schemas/plugins/SSRManifestPlugin.json"),
				this.options,
				{ name: PLUGIN_NAME, baseDataPath: "options" },
				(options) =>
					require("../schemas/plugins/SSRManifestPlugin.check")(options)
			);
		});

		const context = this.options.context || compiler.context;
		const filename = this.options.filename || DEFAULT_FILENAME;

		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					// After RealContentHashPlugin so filenames are final and the emitted
					// manifest is not rewritten (which would invalidate the cache pack).
					stage: Compilation.PROCESS_ASSETS_STAGE_REPORT
				},
				() => {
					const { chunkGraph, moduleGraph } = compilation;
					const publicPath = compilation.getPath(
						compilation.outputOptions.publicPath || ""
					);
					// "auto" resolves in the browser from the script URL, which a
					// build-time manifest cannot do; emit root-absolute paths instead so
					// consumers can inject them from any route (same as `ManifestPlugin`).
					const base = publicPath === "auto" ? "/" : publicPath;
					const dependencies = getChunkDependencies(
						compilation.modules,
						chunkGraph,
						moduleGraph
					);

					/** @type {Map<string, { files: Set<string>, stylesheets: Set<string> }>} */
					const manifest = new Map();

					for (const chunk of compilation.chunks) {
						if (chunk instanceof HotUpdateChunk) continue;

						/** @type {string[]} */
						const files = [];
						/** @type {string[]} */
						const stylesheets = [];
						const requiredChunks = getRequiredChunks(chunk, dependencies);
						for (const required of orderByCascade(
							requiredChunks,
							chunk,
							chunkGraph
						)) {
							for (const file of required.files) {
								// A stylesheet is kept apart: its place is in the cascade,
								// which the sort below would undo.
								if (CSS_FILE_REGEXP.test(file)) stylesheets.push(base + file);
								else files.push(base + file);
							}
							// Source maps are debug-only; keep them out of the preload manifest.
							for (const file of required.auxiliaryFiles) {
								if (!file.endsWith(".map")) files.push(base + file);
							}
						}
						if (files.length === 0 && stylesheets.length === 0) continue;

						for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
							for (const source of sourceModules(module)) {
								if (!(source instanceof NormalModule)) continue;
								const key = makePathsRelative(context, source.resource);
								let entry = manifest.get(key);
								if (entry === undefined) {
									manifest.set(
										key,
										(entry = { files: new Set(), stylesheets: new Set() })
									);
								}
								for (const file of files) entry.files.add(file);
								for (const file of stylesheets) entry.stylesheets.add(file);
							}
						}
					}

					/** @type {Record<string, string[]>} */
					const result = {};
					for (const key of [...manifest.keys()].sort()) {
						const entry =
							/** @type {{ files: Set<string>, stylesheets: Set<string> }} */
							(manifest.get(key));
						// Order-insensitive files sort for a stable manifest; the
						// stylesheets keep the cascade they were collected in.
						result[key] = [...[...entry.files].sort(), ...entry.stylesheets];
					}

					compilation.emitAsset(
						filename,
						new RawSource(JSON.stringify(result, null, 2)),
						{ manifest: true }
					);
				}
			);
		});
	}
}

module.exports = SSRManifestPlugin;
