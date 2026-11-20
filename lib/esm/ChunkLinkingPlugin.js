/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const ConstDependency = require("../dependencies/core/ConstDependency");
const { ImportPhaseUtils } = require("../dependencies/core/ImportPhase");
const ESMExportExpressionDependency = require("../dependencies/esm/ESMExportExpressionDependency");
const ESMExportHeaderDependency = require("../dependencies/esm/ESMExportHeaderDependency");
const ChunkGraph = require("../graph/ChunkGraph");
const ModuleGraph = require("../graph/ModuleGraph");
const isDependencyKind = require("../graph/isDependencyKind");
const Module = require("../module/Module");
const { JAVASCRIPT_TYPE } = require("../module/ModuleSourceTypeConstants");
const ConcatenatedModule = require("../optimize/ConcatenatedModule");
const { STAGE_BASIC } = require("../optimize/OptimizationStages");
const PureExpressionDependency = require("../optimize/PureExpressionDependency");
const { compareModulesByIdentifier } = require("../util/comparators");
const { isLinkChunksEnabled } = require("./linkedBindings");

/** @import Chunk from "../graph/Chunk" */
/** @import Compilation from "../Compilation" */
/** @import Compiler from "../Compiler" */
/** @import Dependency from "../graph/Dependency" */
/** @import { DevTool } from "../../declarations/WebpackOptions" */

const PLUGIN_NAME = "ChunkLinkingPlugin";

// a used export name the native `export { ... as name }` can carry as-is
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

// Presentational dependencies that only rewrite source text, so a module
// carrying them needs no webpack runtime at its chunk's top level.
const PURE_PRESENTATIONAL_DEPENDENCIES = new Set([
	ESMExportExpressionDependency,
	ESMExportHeaderDependency,
	PureExpressionDependency
]);

/**
 * Returns whether a devtool evaluates modules from strings, where a native `export` can't stand.
 * @param {DevTool | undefined} devtool the devtool option
 * @returns {boolean} true for an eval devtool
 */
const usesEvalDevtool = (devtool) => {
	if (typeof devtool === "string") return devtool.includes("eval");
	if (!Array.isArray(devtool)) return false;
	return devtool.some(
		(item) =>
			item.type !== "css" &&
			typeof item.use === "string" &&
			item.use.includes("eval")
	);
};

/**
 * Returns whether an import of a linked module reads only named exports, which a native import can bind.
 * @param {Dependency} dependency the import dependency
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the imported module
 * @returns {boolean} true when a native import can stand in for it
 */
const isLinkableImport = (dependency, moduleGraph, module) => {
	// an import of a side-effect-free module for its side effects is never active
	if (
		!isDependencyKind(dependency, "esm-import-specifier") ||
		isDependencyKind(dependency, "esm-evaluated-import-specifier") ||
		ImportPhaseUtils.isDefer(dependency.phase)
	) {
		return false;
	}
	const ids = dependency.getIds(moduleGraph);
	return (
		ids.length > 0 &&
		moduleGraph.getExportsInfo(module).isExportProvided(ids[0]) === true
	);
};

/**
 * Returns whether a dependency of a linked module needs nothing at the chunk's top level but its own source edit.
 * @param {Dependency} dependency a dependency or presentational dependency
 * @returns {boolean} true when the dependency is pure
 */
const isPureDependency = (dependency) => {
	if (
		isDependencyKind(dependency, "esm-export-specifier") ||
		isDependencyKind(dependency, "esm-compatibility")
	) {
		return true;
	}
	const { constructor } = dependency;
	if (constructor === ConstDependency) {
		return !(/** @type {ConstDependency} */ (dependency).runtimeRequirements);
	}
	return PURE_PRESENTATIONAL_DEPENDENCIES.has(
		/** @type {EXPECTED_ANY} */ (constructor)
	);
};

/**
 * Links side-effect-free ES modules that only other chunks import across async chunks with native `import`/`export`:
 * each chunk declares them in one top-level scope, and importers bind their exports directly instead of through the module registry.
 */
class ChunkLinkingPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			if (
				!isLinkChunksEnabled(compilation.runtimeTemplate) ||
				usesEvalDevtool(compilation.options.devtool)
			) {
				return;
			}
			compilation.hooks.optimizeChunkModules.tapAsync(
				{ name: PLUGIN_NAME, stage: STAGE_BASIC },
				(chunks, modules, callback) => {
					this._link(compiler, compilation, modules, callback);
				}
			);
			compilation.hooks.chunkHashDependencies.tap(
				PLUGIN_NAME,
				(chunk, dependencies) => {
					const { chunkGraph, moduleGraph } = compilation;
					for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
						for (const connection of moduleGraph.getOutgoingConnections(
							module
						)) {
							if (!connection.module) continue;
							const meta = moduleGraph.getMetaIfExisting(connection.module);
							if (meta === undefined || meta.linkedBinding === undefined) {
								continue;
							}
							for (const other of chunkGraph.getModuleChunksIterable(
								meta.linkedBinding.scope
							)) {
								if (other !== chunk) dependencies.add(other);
							}
						}
					}
				}
			);
		});
	}

	/**
	 * Returns the async chunk a module may be linked in, or undefined when it must stay in the registry.
	 * @param {Compilation} compilation the compilation
	 * @param {Module} module the module
	 * @returns {Chunk | undefined} the chunk
	 */
	_getLinkableChunk(compilation, module) {
		const { chunkGraph, moduleGraph } = compilation;
		if (chunkGraph.getNumberOfModuleChunks(module) !== 1) return;
		const [chunk] = chunkGraph.getModuleChunksIterable(module);
		if (
			chunk.hasRuntime() ||
			chunk.canBeInitial() ||
			chunkGraph.getNumberOfEntryModules(chunk) > 0
		) {
			return;
		}
		if (
			module.getConcatenationBailoutReason({
				chunkGraph,
				moduleGraph,
				concatenateCommonJsModules: false
			})
		) {
			return;
		}
		const buildInfo = /** @type {import("../module/Module").BuildInfo} */ (
			module.buildInfo
		);
		const buildMeta = /** @type {import("../module/Module").BuildMeta} */ (
			module.buildMeta
		);
		if (
			buildMeta.exportsType !== "namespace" ||
			!buildInfo.strict ||
			buildInfo.specNamespaceObject ||
			buildInfo.moduleConcatenationRootBailout ||
			moduleGraph.isAsync(module) ||
			moduleGraph.isDeferred(module) ||
			module.blocks.length > 0 ||
			module.getSideEffectsConnectionState(moduleGraph) !== false
		) {
			return;
		}
		const basicTypes = Module.getSourceBasicTypes(module);
		if (basicTypes.size !== 1 || !basicTypes.has(JAVASCRIPT_TYPE)) return;
		for (const dependency of module.dependencies) {
			if (
				!isPureDependency(dependency) &&
				!isDependencyKind(dependency, "esm-import")
			) {
				return;
			}
		}
		for (const dependency of module.presentationalDependencies || []) {
			if (!isPureDependency(dependency)) return;
		}
		for (const exportInfo of moduleGraph.getExportsInfo(module)
			.orderedExports) {
			if (exportInfo.provided === false) continue;
			const used = exportInfo.getUsedName(undefined, chunk.runtime);
			if (typeof used === "string" && !IDENTIFIER.test(used)) return;
		}
		return chunk;
	}

	/**
	 * Returns whether a candidate's imports and importers still allow linking it, given the other candidates.
	 * @param {Compilation} compilation the compilation
	 * @param {Module} module the candidate
	 * @param {Chunk} chunk the candidate's chunk
	 * @param {Map<Module, Chunk>} candidates the candidates and their chunks
	 * @returns {boolean} true when the candidate may stay
	 */
	_canLink(compilation, module, chunk, candidates) {
		const { chunkGraph, moduleGraph } = compilation;
		// the scope has no registry to reach: every import must be hoisted with it
		for (const connection of moduleGraph.getOutgoingConnections(module)) {
			if (!connection.isTargetActive(chunk.runtime)) continue;
			if (candidates.get(connection.module) !== chunk) return false;
		}
		for (const [
			origin,
			connections
		] of moduleGraph.getIncomingConnectionsByOriginModule(module)) {
			if (!origin) return false;
			let active = false;
			for (const connection of connections) {
				if (!connection.isTargetActive(chunk.runtime)) continue;
				active = true;
				if (
					!isLinkableImport(
						/** @type {Dependency} */ (connection.dependency),
						moduleGraph,
						module
					)
				) {
					return false;
				}
			}
			if (!active) continue;
			// a registry module of the same file can't name the exported aliases
			if (
				candidates.get(origin) !== chunk &&
				chunkGraph.isModuleInChunk(origin, chunk)
			) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Selects the linkable modules and hoists each chunk's into one linked scope.
	 * @param {Compiler} compiler the compiler
	 * @param {Compilation} compilation the compilation
	 * @param {Iterable<Module>} modules the modules
	 * @param {(err?: Error | null) => void} callback callback
	 * @returns {void}
	 */
	_link(compiler, compilation, modules, callback) {
		const { chunkGraph, moduleGraph } = compilation;
		/** @type {Map<Module, Chunk>} */
		const candidates = new Map();
		for (const module of modules) {
			const chunk = this._getLinkableChunk(compilation, module);
			if (chunk !== undefined) candidates.set(module, chunk);
		}
		let changed = true;
		while (changed) {
			changed = false;
			for (const [module, chunk] of candidates) {
				if (!this._canLink(compilation, module, chunk, candidates)) {
					candidates.delete(module);
					changed = true;
				}
			}
		}
		/** @type {Map<Chunk, Module[]>} */
		const groups = new Map();
		for (const [module, chunk] of candidates) {
			const group = groups.get(chunk);
			if (group === undefined) {
				groups.set(chunk, [module]);
			} else {
				group.push(module);
			}
		}
		const backCompat = compilation.options.experiments.backCompat;
		const groupList = [...groups];
		let index = 0;
		const next = () => {
			if (index === groupList.length) return callback();
			const [chunk, members] = groupList[index++];
			members.sort(compareModulesByIdentifier);
			const modulesSet = new Set(members);
			const scope = ConcatenatedModule.create(
				members[0],
				modulesSet,
				chunk.runtime,
				compilation,
				compiler.root,
				compilation.outputOptions.hashFunction,
				members
			);
			scope.build(
				compilation.options,
				compilation,
				/** @type {EXPECTED_ANY} */ (null),
				/** @type {EXPECTED_ANY} */ (null),
				(err) => {
					if (err) return callback(err);
					if (backCompat) {
						ChunkGraph.setChunkGraphForModule(scope, chunkGraph);
						ModuleGraph.setModuleGraphForModule(scope, moduleGraph);
					}
					moduleGraph.cloneModuleAttributes(members[0], scope);
					moduleGraph.getMeta(scope).linkedScope = true;
					for (let i = 0; i < members.length; i++) {
						const member = members[i];
						if (compilation.builtModules.has(member)) {
							compilation.builtModules.add(scope);
						}
						moduleGraph.getMeta(member).linkedBinding = { scope, index: i };
						chunkGraph.disconnectChunkAndModule(chunk, member);
					}
					chunkGraph.connectChunkAndModule(chunk, scope);
					compilation.modules.add(scope);
					next();
				}
			);
		};
		next();
	}
}

module.exports = ChunkLinkingPlugin;
