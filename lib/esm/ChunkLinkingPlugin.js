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
const { isCrossChunkImportsEnabled } = require("../util/concatenate");

/** @import Chunk from "../graph/Chunk" */
/** @import Compilation from "../Compilation" */
/** @import Compiler from "../Compiler" */
/** @import Dependency from "../graph/Dependency" */
/** @import { DevTool } from "../../declarations/WebpackOptions" */
/** @import { InputFileSystem } from "../fs/fs" */
/** @import { ResolverWithOptions } from "../resolve/ResolverFactory" */

const PLUGIN_NAME = "ChunkLinkingPlugin";

// a used export name the native `export { ... as name }` can carry as-is
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

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
 * Returns whether an import of a linked module reads named exports or the namespace object, which a native import can bind.
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
	// a namespace value binds the scope's namespace object
	return (
		ids.length === 0 ||
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
	// presentational dependencies that only rewrite source text
	return (
		constructor === ESMExportExpressionDependency ||
		constructor === ESMExportHeaderDependency ||
		constructor === PureExpressionDependency
	);
};

/**
 * Returns why a dependency keeps its module in the registry.
 * @param {Dependency} dependency the dependency
 * @returns {string} the bailout reason
 */
const getDependencyBailout = (dependency) => {
	const { type } = dependency;
	// presentational dependencies share the "null" type
	return type === "null" || type === "unknown"
		? "module uses the webpack runtime"
		: `${type} needs the module registry`;
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
				!compilation.runtimeTemplate.isModule() ||
				// only the module chunk format renders a linked scope
				compilation.outputOptions.chunkFormat !== "module" ||
				!isCrossChunkImportsEnabled(
					compilation.options.optimization.concatenateModules
				) ||
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
	 * Returns the async chunk a module may be linked in, or why it must stay in the registry.
	 * @param {Compilation} compilation the compilation
	 * @param {Module} module the module
	 * @returns {Chunk | string | undefined} the chunk, the bailout reason, or undefined for a module no async chunk holds alone
	 */
	_getLinkableChunk(compilation, module) {
		const { chunkGraph, moduleGraph } = compilation;
		const numberOfChunks = chunkGraph.getNumberOfModuleChunks(module);
		if (numberOfChunks === 0) return;
		if (numberOfChunks !== 1) return "module is in more than one chunk";
		const [chunk] = chunkGraph.getModuleChunksIterable(module);
		if (
			chunk.hasRuntime() ||
			chunk.canBeInitial() ||
			chunkGraph.getNumberOfEntryModules(chunk) > 0
		) {
			return;
		}
		const concatenationBailout = module.getConcatenationBailoutReason({
			chunkGraph,
			moduleGraph,
			concatenateCommonJsModules: false
		});
		if (concatenationBailout) return concatenationBailout;
		const buildInfo = /** @type {import("../module/Module").BuildInfo} */ (
			module.buildInfo
		);
		const buildMeta = /** @type {import("../module/Module").BuildMeta} */ (
			module.buildMeta
		);
		if (buildMeta.exportsType !== "namespace")
			{return "module is not an ES module";}
		if (!buildInfo.strict || buildInfo.specNamespaceObject) {
			return "module is not in strict mode";
		}
		if (buildInfo.moduleConcatenationRootBailout) {
			return buildInfo.moduleConcatenationRootBailout;
		}
		if (moduleGraph.isAsync(module)) return "module is async";
		if (moduleGraph.isDeferred(module)) return "module is deferred";
		if (module.blocks.length > 0) return "module has async blocks";
		if (module.getSideEffectsConnectionState(moduleGraph) !== false) {
			return "module has side effects";
		}
		const basicTypes = Module.getSourceBasicTypes(module);
		if (basicTypes.size !== 1 || !basicTypes.has(JAVASCRIPT_TYPE)) {
			return "module has non-JavaScript sources";
		}
		for (const dependency of module.dependencies) {
			if (
				!isPureDependency(dependency) &&
				!isDependencyKind(dependency, "esm-import")
			) {
				return getDependencyBailout(dependency);
			}
		}
		for (const dependency of module.presentationalDependencies || []) {
			if (!isPureDependency(dependency)) {
				return getDependencyBailout(dependency);
			}
		}
		for (const exportInfo of moduleGraph.getExportsInfo(module)
			.orderedExports) {
			if (exportInfo.provided === false) continue;
			const used = exportInfo.getUsedName(undefined, chunk.runtime);
			if (typeof used === "string" && !IDENTIFIER.test(used)) {
				return `export ${JSON.stringify(used)} is not an identifier`;
			}
		}
		return chunk;
	}

	/**
	 * Returns why a candidate's imports or importers no longer allow linking it, given the other candidates.
	 * @param {Compilation} compilation the compilation
	 * @param {Module} module the candidate
	 * @param {Chunk} chunk the candidate's chunk
	 * @param {Map<Module, Chunk>} candidates the candidates and their chunks
	 * @returns {string | undefined} the bailout reason, or undefined when the candidate may stay
	 */
	_getLinkBailout(compilation, module, chunk, candidates) {
		const { moduleGraph, requestShortener } = compilation;
		// the scope has no registry to reach: every import must be hoisted with it
		for (const connection of moduleGraph.getOutgoingConnections(module)) {
			if (!connection.isTargetActive(chunk.runtime)) continue;
			const imported = /** @type {Module} */ (connection.module);
			if (candidates.get(imported) !== chunk) {
				return `imported module ${imported.readableIdentifier(
					requestShortener
				)} stays in the registry`;
			}
		}
		for (const [
			origin,
			connections
		] of moduleGraph.getIncomingConnectionsByOriginModule(module)) {
			if (!origin) return "module is an entry";
			for (const connection of connections) {
				if (!connection.isTargetActive(chunk.runtime)) continue;
				const dependency = /** @type {Dependency} */ (connection.dependency);
				if (!isLinkableImport(dependency, moduleGraph, module)) {
					return `${origin.readableIdentifier(
						requestShortener
					)} imports it through ${dependency.type}`;
				}
			}
		}
	}

	/**
	 * Returns whether a static ES import from a module outside the module's chunk reaches it, so a bailout is worth reporting.
	 * @param {Compilation} compilation the compilation
	 * @param {Module} module the module
	 * @returns {boolean} true when another chunk imports the module
	 */
	_isImportedAcrossChunks(compilation, module) {
		const { chunkGraph, moduleGraph } = compilation;
		for (const connection of moduleGraph.getIncomingConnections(module)) {
			const { originModule, dependency } = connection;
			if (
				!originModule ||
				!dependency ||
				!isDependencyKind(dependency, "esm-import")
			) {
				continue;
			}
			for (const chunk of chunkGraph.getModuleChunksIterable(originModule)) {
				if (!chunkGraph.isModuleInChunk(module, chunk)) return true;
			}
		}
		return false;
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
		// an additional seal keeps the module graph, and with it the last seal's links
		for (const module of modules) {
			const meta = moduleGraph.getMetaIfExisting(module);
			if (meta !== undefined) {
				meta.linkedBinding = undefined;
				meta.linkedScope = undefined;
			}
		}
		/**
		 * Reports why a module another chunk imports stays in the registry.
		 * @param {Module} module the module
		 * @param {string} reason the bailout reason
		 */
		const bailout = (module, reason) => {
			if (this._isImportedAcrossChunks(compilation, module)) {
				moduleGraph
					.getOptimizationBailout(module)
					.push(`Cross-chunk imports bailout: ${reason}`);
			}
		};
		/** @type {Map<Module, Chunk>} */
		const candidates = new Map();
		for (const module of modules) {
			const chunk = this._getLinkableChunk(compilation, module);
			if (typeof chunk === "string") {
				bailout(module, chunk);
			} else if (chunk !== undefined) {
				candidates.set(module, chunk);
			}
		}
		let changed = true;
		while (changed) {
			changed = false;
			for (const [module, chunk] of candidates) {
				const reason = this._getLinkBailout(
					compilation,
					module,
					chunk,
					candidates
				);
				if (reason !== undefined) {
					bailout(module, reason);
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
				/** @type {ResolverWithOptions} */
				(/** @type {ResolverWithOptions | null} */ (null)),
				/** @type {InputFileSystem} */
				(/** @type {InputFileSystem | null} */ (null)),
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
