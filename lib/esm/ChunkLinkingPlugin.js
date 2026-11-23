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
/** @import ModuleDependency from "../dependencies/core/ModuleDependency" */
/** @import { RuntimeSpec } from "../util/runtime" */

const PLUGIN_NAME = "ChunkLinkingPlugin";

const BAILOUT_PREFIX = "Cross-chunk imports bailout: ";

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
 * Returns whether an import of a linked module reads or re-exports named exports or the namespace object, which a native import can bind.
 * @param {Dependency} dependency the import dependency
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the imported module
 * @param {RuntimeSpec} runtime the runtime
 * @returns {boolean} true when a native import can stand in for it
 */
const isLinkableImport = (dependency, moduleGraph, module, runtime) => {
	// an import of a side-effect-free module for its side effects is never active
	// the scope has run by the time the importer evaluates
	if (isDependencyKind(dependency, "esm-side-effect-import")) {
		return !ImportPhaseUtils.isDefer(dependency.phase);
	}
	if (isDependencyKind(dependency, "esm-reexport")) {
		if (ImportPhaseUtils.isDefer(dependency.phase)) return false;
		const mode = dependency.getMode(moduleGraph, runtime);
		if (mode.type === "reexport-namespace-object") return true;
		// a checked item tests the exports object at runtime
		return (
			mode.type === "normal-reexport" &&
			/** @type {NonNullable<typeof mode.items>} */ (mode.items).every(
				(item) => !item.checked
			)
		);
	}
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
 * Returns whether evaluating a module can have observable effects.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the module
 * @returns {boolean} true unless the module is known to be side-effect-free
 */
const hasSideEffects = (moduleGraph, module) =>
	module.getSideEffectsConnectionState(moduleGraph) !== false;

/**
 * Returns the modules evaluating a module evaluates first: its static ES imports in source order, then what its body loads synchronously.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module} module the module
 * @param {RuntimeSpec} runtime the runtime
 * @returns {{ imports: Module[], others: Module[] }} the imported and the otherwise loaded modules
 */
const getEvaluatedDependencies = (moduleGraph, module, runtime) => {
	/** @type {Map<Module, number>} */
	const importOrder = new Map();
	/** @type {Set<Module>} */
	const others = new Set();
	for (const connection of moduleGraph.getOutgoingConnections(module)) {
		const target = connection.module;
		const { dependency } = connection;
		if (
			!target ||
			!dependency ||
			target === module ||
			// an `import()` evaluates its target in a later chunk group
			moduleGraph.getParentBlock(dependency) !== module ||
			!connection.isTargetActive(runtime)
		) {
			continue;
		}
		if (isDependencyKind(dependency, "esm-import")) {
			// an `import defer` evaluates its target on first access instead
			if (ImportPhaseUtils.isDefer(dependency.phase)) continue;
			const { sourceOrder } = /** @type {ModuleDependency} */ (dependency);
			const order = typeof sourceOrder === "number" ? sourceOrder : Infinity;
			const previous = importOrder.get(target);
			if (previous === undefined || order < previous) {
				importOrder.set(target, order);
			}
		} else {
			others.add(target);
		}
	}
	const imports = [...importOrder.keys()].sort(
		(a, b) =>
			/** @type {number} */ (importOrder.get(a)) -
			/** @type {number} */ (importOrder.get(b))
	);
	for (const imported of imports) others.delete(imported);
	return { imports, others: [...others] };
};

/**
 * Returns the leading side effects of one chunk group load that belong to the given modules, in evaluation order.
 * The walk stops at the first other effect, or at an effect a body may skip, since a linked scope runs before both.
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {Module[]} roots the modules the load evaluates, in order
 * @param {Set<Module>} evaluated modules that have already run when the load starts
 * @param {Set<Module>} members the modules whose effects the chunk's scope would run
 * @param {RuntimeSpec} runtime the runtime
 * @returns {Module[]} the members the load evaluates before any other effect
 */
const getLeadingEffects = (moduleGraph, roots, evaluated, members, runtime) => {
	/** @type {Module[]} */
	const leading = [];
	const visited = new Set(evaluated);
	/** @type {{ module: Module, certain: boolean, imports: Module[], others: Module[], index: number, done: boolean }[]} */
	const stack = [];
	/**
	 * Starts evaluating a module that hasn't run yet.
	 * @param {Module} module the module
	 * @param {boolean} certain whether reaching the module through static imports only guarantees it runs
	 */
	const enter = (module, certain) => {
		if (visited.has(module)) return;
		visited.add(module);
		const { imports, others } = getEvaluatedDependencies(
			moduleGraph,
			module,
			runtime
		);
		stack.push({ module, certain, imports, others, index: 0, done: false });
	};
	for (const root of roots) {
		enter(root, true);
		while (stack.length > 0) {
			const frame = stack[stack.length - 1];
			if (frame.index < frame.imports.length) {
				enter(frame.imports[frame.index++], frame.certain);
				continue;
			}
			// a body's own effects may run before what it loads synchronously
			if (!frame.done) {
				frame.done = true;
				if (hasSideEffects(moduleGraph, frame.module)) {
					if (!frame.certain || !members.has(frame.module)) return leading;
					leading.push(frame.module);
					if (leading.length === members.size) return leading;
				}
			}
			const other = frame.index - frame.imports.length;
			if (other < frame.others.length) {
				frame.index++;
				enter(frame.others[other], false);
				continue;
			}
			stack.pop();
		}
	}
	return leading;
};

/**
 * Estimated gzip bytes linking a module saves or costs, tuned so no ES module sample app of `test/sizeCoreReports/` grows.
 * @type {Record<"factory" | "getter" | "lookup" | "use" | "export" | "import" | "statement", number>}
 */
const COST = {
	factory: 12,
	getter: 3,
	lookup: 6,
	use: 0.1,
	export: 3,
	import: 3,
	statement: 20
};

/**
 * Returns the names an importer reads of a linked module, "" standing for its namespace object.
 * @param {Dependency} dependency the importer's dependency
 * @param {ModuleGraph} moduleGraph the module graph
 * @param {RuntimeSpec} runtime the runtime
 * @returns {string[]} the names, none when it reads none
 */
const getImportedNames = (dependency, moduleGraph, runtime) => {
	if (isDependencyKind(dependency, "esm-import-specifier")) {
		const ids = dependency.getIds(moduleGraph);
		return [
			ids.length === 0 || dependency.namespaceObjectAsContext ? "" : ids[0]
		];
	}
	if (!isDependencyKind(dependency, "esm-reexport")) return [];
	const mode = dependency.getMode(moduleGraph, runtime);
	if (mode.type !== "normal-reexport") return [""];
	// each re-exported name is a native export and import of its own
	/** @type {string[]} */
	const names = [];
	for (const item of /** @type {NonNullable<typeof mode.items>} */ (
		mode.items
	)) {
		if (!item.hidden) names.push(item.ids.length === 0 ? "" : item.ids[0]);
	}
	return names;
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
 * Links ES modules other chunks import with native `import`/`export`: each chunk declares them in one top-level scope,
 * and importers bind their exports directly instead of through the module registry. Limits: docs/cross-chunk-imports.md.
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
	 * Returns the chunk a module may be linked in, or why it must stay in the registry.
	 * @param {Compilation} compilation the compilation
	 * @param {Module} module the module
	 * @returns {Chunk | string | undefined} the chunk, the bailout reason, or undefined for a module in no chunk
	 */
	_getLinkableChunk(compilation, module) {
		const { chunkGraph, moduleGraph } = compilation;
		const numberOfChunks = chunkGraph.getNumberOfModuleChunks(module);
		if (numberOfChunks === 0) return;
		if (numberOfChunks !== 1) return "module is in more than one chunk";
		const [chunk] = chunkGraph.getModuleChunksIterable(module);
		// an entry chunk's URL is the page's to choose, so no chunk can import it
		if (chunk.hasRuntime() || chunkGraph.getNumberOfEntryModules(chunk) > 0) {
			return "chunk holds the runtime or an entry";
		}
		// each runtime keeps its own registry instance of a module
		if (typeof chunk.runtime !== "string") {
			return "chunk is shared by more than one runtime";
		}
		if (chunk.canBeInitial() && !chunk.isOnlyInitial()) {
			return "chunk is loaded both initially and on demand";
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
		if (buildMeta.exportsType !== "namespace") {
			return "module is not an ES module";
		}
		if (!buildInfo.strict || buildInfo.specNamespaceObject) {
			return "module is not in strict mode";
		}
		if (buildInfo.moduleConcatenationRootBailout) {
			return buildInfo.moduleConcatenationRootBailout;
		}
		if (moduleGraph.isAsync(module)) return "module is async";
		if (moduleGraph.isDeferred(module)) return "module is deferred";
		if (module.blocks.length > 0) return "module has async blocks";
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
		const { chunkGraph, moduleGraph, requestShortener } = compilation;
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
			let active = false;
			for (const connection of connections) {
				if (!connection.isTargetActive(chunk.runtime)) continue;
				active = true;
				const dependency = /** @type {Dependency} */ (connection.dependency);
				if (!isLinkableImport(dependency, moduleGraph, module, chunk.runtime)) {
					return `${origin.readableIdentifier(
						requestShortener
					)} imports it through ${dependency.type}`;
				}
			}
			if (!active || !chunk.canBeInitial()) continue;
			// on-demand chunks resolve against the public path, initial ones against the entry
			for (const originChunk of chunkGraph.getModuleChunksIterable(origin)) {
				if (!originChunk.isOnlyInitial()) {
					return `${origin.readableIdentifier(
						requestShortener
					)} imports it from an on-demand chunk`;
				}
			}
		}
	}

	/**
	 * Returns the side-effect candidates of a chunk that every load of the chunk runs first, in the one order all loads agree on.
	 * A linked scope runs them when the chunk loads, before anything else the load evaluates.
	 * @param {Compilation} compilation the compilation
	 * @param {Chunk} chunk the chunk
	 * @param {Set<Module>} members the chunk's candidates with side effects
	 * @param {Map<Module, Set<Module>>} evaluatedBefore the modules certainly evaluated once an `import()` in a module runs, by module
	 * @returns {Module[]} the members to keep, in the order the scope must run them
	 */
	_getEffectOrder(compilation, chunk, members, evaluatedBefore) {
		const { chunkGraph, moduleGraph } = compilation;
		const { runtime } = chunk;
		/** @type {Module[] | undefined} */
		let order;
		/**
		 * Narrows the order to its common prefix with one load's leading effects.
		 * @param {Module[]} roots the modules the load evaluates, in order
		 * @param {Set<Module>} evaluated modules that have run when the load starts
		 */
		const addLoad = (roots, evaluated) => {
			const leading = getLeadingEffects(
				moduleGraph,
				roots,
				evaluated,
				members,
				runtime
			);
			if (order === undefined) {
				order = leading;
				return;
			}
			let length = 0;
			while (
				length < order.length &&
				length < leading.length &&
				order[length] === leading[length]
			) {
				length++;
			}
			order.length = length;
		};
		for (const group of chunk.groupsIterable) {
			if (group.isEntrypoint()) {
				addLoad(
					[
						...chunkGraph.getChunkEntryModulesIterable(
							group.getEntrypointChunk()
						)
					],
					new Set()
				);
				continue;
			}
			const blocks = group.getBlocks();
			// an unknown load can't be checked
			if (blocks.length === 0) return [];
			for (const block of blocks) {
				for (const dependency of block.dependencies) {
					const root = moduleGraph.getModule(dependency);
					const origin = moduleGraph.getParentModule(dependency);
					if (!root || !origin) return [];
					let evaluated = evaluatedBefore.get(origin);
					if (evaluated === undefined) {
						// the `import()` runs in the origin's body, after its static imports
						evaluated = new Set([origin]);
						for (const module of evaluated) {
							for (const imported of getEvaluatedDependencies(
								moduleGraph,
								module,
								runtime
							).imports) {
								evaluated.add(imported);
							}
						}
						evaluatedBefore.set(origin, evaluated);
					}
					addLoad([root], evaluated);
				}
			}
		}
		return order || [];
	}

	/**
	 * Returns the candidates whose linking would cost more bytes than it saves.
	 * A linked module saves its registry factory, export getters and each importer's lookup, and costs a native export and import per name, plus an import statement per importing chunk.
	 * @param {Compilation} compilation the compilation
	 * @param {Map<Module, Chunk>} candidates the candidates and their chunks
	 * @returns {Module[]} the candidates to keep in the registry
	 */
	_getCostlyCandidates(compilation, candidates) {
		const { chunkGraph, moduleGraph } = compilation;
		/** @type {Map<Module, { names: Map<Chunk, Set<string>>, importers: Set<Module>, uses: number }>} */
		const demands = new Map();
		/** @type {Map<Chunk, Map<Chunk, number>>} */
		const pairs = new Map();
		for (const [module, chunk] of candidates) {
			/** @type {Map<Chunk, Set<string>>} */
			const names = new Map();
			/** @type {Set<Module>} */
			const importers = new Set();
			let uses = 0;
			for (const connection of moduleGraph.getIncomingConnections(module)) {
				const { originModule, dependency } = connection;
				if (
					!originModule ||
					!dependency ||
					candidates.get(originModule) === chunk ||
					!connection.isTargetActive(chunk.runtime)
				) {
					continue;
				}
				const importedNames = getImportedNames(
					dependency,
					moduleGraph,
					chunk.runtime
				);
				if (importedNames.length === 0) continue;
				importers.add(originModule);
				for (const importerChunk of chunkGraph.getModuleChunksIterable(
					originModule
				)) {
					// a use in the module's own chunk saves nothing, as the registry concatenates it
					if (importerChunk !== chunk) uses++;
					let chunkNames = names.get(importerChunk);
					if (chunkNames === undefined) {
						chunkNames = new Set();
						names.set(importerChunk, chunkNames);
					}
					for (const name of importedNames) chunkNames.add(name);
				}
			}
			if (importers.size === 0) continue;
			demands.set(module, { names, importers, uses });
			let chunkPairs = pairs.get(chunk);
			if (chunkPairs === undefined) {
				chunkPairs = new Map();
				pairs.set(chunk, chunkPairs);
			}
			for (const importerChunk of names.keys()) {
				chunkPairs.set(importerChunk, (chunkPairs.get(importerChunk) || 0) + 1);
			}
		}
		/** @type {Module[]} */
		const costly = [];
		for (const [module, { names, uses }] of demands) {
			const chunkPairs =
				/** @type {Map<Chunk, number>} */
				(pairs.get(/** @type {Chunk} */ (candidates.get(module))));
			/** @type {Set<string>} */
			const exported = new Set();
			let cost = 0;
			for (const [importerChunk, chunkNames] of names) {
				for (const name of chunkNames) exported.add(name);
				cost +=
					COST.import * chunkNames.size +
					COST.statement /
						/** @type {number} */ (chunkPairs.get(importerChunk));
			}
			cost += COST.export * exported.size;
			// the registry concatenates a module into an importer of its own chunk, so those save nothing
			const chunk = /** @type {Chunk} */ (candidates.get(module));
			const otherChunks = names.size - (names.has(chunk) ? 1 : 0);
			// concatenation leaves about one registry lookup per importing chunk
			const saving =
				otherChunks === 0
					? 0
					: COST.factory +
						COST.getter * exported.size +
						COST.lookup * otherChunks +
						COST.use * uses;
			if (saving < cost) costly.push(module);
		}
		return costly;
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
		/** @type {Module[]} */
		const staleScopes = [];
		// an additional seal keeps the module graph, and with it the last seal's links
		for (const module of modules) {
			const meta = moduleGraph.getMetaIfExisting(module);
			if (meta !== undefined) {
				if (meta.linkedScope === true) staleScopes.push(module);
				meta.linkedBinding = undefined;
				meta.linkedScope = undefined;
			}
			const bailouts = moduleGraph.getOptimizationBailout(module);
			for (let i = bailouts.length - 1; i >= 0; i--) {
				const bailout = bailouts[i];
				if (typeof bailout === "string" && bailout.startsWith(BAILOUT_PREFIX)) {
					bailouts.splice(i, 1);
				}
			}
		}
		// the scope is rebuilt below, so the last seal's must not stay a second module of its identifier
		for (const scope of staleScopes) {
			compilation.modules.delete(scope);
			compilation.builtModules.delete(scope);
			ChunkGraph.clearChunkGraphForModule(scope);
			ModuleGraph.clearModuleGraphForModule(scope);
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
					.push(`${BAILOUT_PREFIX}${reason}`);
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
		const { strictModuleExceptionHandling, strictModuleErrorHandling } =
			compilation.outputOptions;
		const retriesFailedModules =
			strictModuleExceptionHandling && !strictModuleErrorHandling;
		// "always" links whatever is correct to link, whatever it costs in bytes
		const alwaysLink =
			/** @type {Exclude<typeof compilation.options.optimization.concatenateModules, boolean | undefined>} */
			(compilation.options.optimization.concatenateModules)
				.crossChunkImports === "always";
		/** @type {Map<Chunk, Module[]>} */
		const effectOrders = new Map();
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
			if (changed) continue;
			// the scope runs its members' effects at chunk load, which must not reorder them
			/** @type {Map<Chunk, Set<Module>>} */
			const withEffects = new Map();
			for (const [module, chunk] of candidates) {
				if (!hasSideEffects(moduleGraph, module)) continue;
				// the registry runs a module that threw again on the next import; native modules don't
				if (retriesFailedModules) {
					bailout(
						module,
						"module has side effects and a failed module runs again on retry"
					);
					candidates.delete(module);
					changed = true;
					continue;
				}
				const members = withEffects.get(chunk);
				if (members === undefined) {
					withEffects.set(chunk, new Set([module]));
				} else {
					members.add(module);
				}
			}
			/** @type {Map<Module, Set<Module>>} */
			const evaluatedBefore = new Map();
			effectOrders.clear();
			for (const [chunk, members] of withEffects) {
				const order = this._getEffectOrder(
					compilation,
					chunk,
					members,
					evaluatedBefore
				);
				effectOrders.set(chunk, order);
				if (order.length === members.size) continue;
				const kept = new Set(order);
				for (const module of members) {
					if (kept.has(module)) continue;
					bailout(
						module,
						"module has side effects that its chunk's loads don't all run first"
					);
					candidates.delete(module);
					changed = true;
				}
			}
			if (changed || alwaysLink) continue;
			for (const module of this._getCostlyCandidates(compilation, candidates)) {
				bailout(module, "linking it would grow the output");
				candidates.delete(module);
				changed = true;
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
			// side effects first, in the order every load of the chunk runs them
			const effectOrder = effectOrders.get(chunk);
			if (effectOrder !== undefined && effectOrder.length > 0) {
				const effects = new Set(effectOrder);
				members.splice(
					0,
					members.length,
					...effectOrder,
					...members.filter((member) => !effects.has(member))
				);
			}
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
