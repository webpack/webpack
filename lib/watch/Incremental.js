/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sebastian Beltran @bjohansebas
*/

"use strict";

const { makeWebpackError } = require("../errors/HookWebpackError");
const LazySet = require("../util/LazySet");
const { getOrInsert } = require("../util/MapHelpers");
const asyncLib = require("../util/async");
const memoize = require("../util/memoize");

const getNormalModule = memoize(() => require("../module/NormalModule"));

/** @import Compilation, { EntryData, ModuleCallback, DependencyConstructor } from "../Compilation" */
/** @import Compiler from "../Compiler" */
/** @import { EntryOptions } from "../graph/Entrypoint" */
/** @import Module from "../module/Module" */
/** @import NormalModule from "../module/NormalModule" */
/** @import NormalModuleFactory from "../module/NormalModuleFactory" */
/** @import ModuleFactory, { ModuleFactoryResult } from "../module/ModuleFactory" */
/** @import Dependency from "../graph/Dependency" */
/** @import AsyncDependenciesBlock from "../graph/AsyncDependenciesBlock" */
/** @import WebpackError from "../errors/WebpackError" */
/** @typedef {{ disabled: boolean, configEntryDependencies: WeakSet<Dependency> }} CompilerState */
/** @typedef {{ fileDependencies?: LazySet<string>, contextDependencies?: LazySet<string>, missingDependencies?: LazySet<string> }} ResolveDependencies */

/** @type {WeakMap<Compiler, CompilerState>} */
const compilerStates = new WeakMap();

class Incremental {
	/**
	 * @param {Compilation} compilation compilation being built
	 * @param {Compilation | undefined} previous previous reusable compilation
	 * @param {Map<string, Module>} modulesMap compilation's live module map
	 */
	constructor(compilation, previous, modulesMap) {
		this._compilation = compilation;
		this._modulesMap = modulesMap;
		let state = compilerStates.get(compilation.compiler);
		if (state === undefined) {
			state = {
				disabled: compilation.options.incremental.buildModuleGraph === false,
				configEntryDependencies: new WeakSet()
			};
			compilerStates.set(compilation.compiler, state);
		}
		this._state = state;
		this.rebuilding = previous !== undefined;
		/** @type {WeakSet<Module>} */
		this._newModules = new WeakSet();

		// factorization failures are invisible to needBuild snapshots — retry each
		// rebuild until they resolve (self-clearing)
		/** @type {Set<Module>} */
		this.errorModules = previous
			? previous._incremental.errorModules
			: new Set();
		// end-of-make module set (captured at seal start), base for the next rebuild
		/** @type {Set<Module>} */
		this.baseModules = compilation.modules;
		/** @type {Map<string, Module>} */
		this.baseModulesMap = this._modulesMap;
		// modules re-seeded via a null-origin chain (prefetch plugins): graph roots
		// even though persisted with an importer's issuer
		/** @type {Set<Module>} */
		this._seedRoots = new Set();
		// entry dependencies re-added by this make's entry plugins; persisted dependencies not
		// re-added were removed upstream (dynamic entries) and are dropped
		/** @type {Set<Dependency> | undefined} */
		this._touchedEntries = this.rebuilding ? new Set() : undefined;
		// persisted entryData whose options were reset by this make's first touch
		/** @type {Set<EntryData> | undefined} */
		this._touchedEntryData = this.rebuilding ? new Set() : undefined;
		this._entriesDropped = false;
		// prev post-seal module set; seal-only modules are swept from the durable
		// graph in _rebuild so they don't accumulate
		/** @type {Set<Module> | undefined} */
		this._previousSealModules = previous ? previous.modules : undefined;
		// old dependencies/blocks of deferred re-factorizations; the importer-driven
		// rebuild replaces the dependencies without the direct re-factorize cleanup
		/** @type {Map<Module, { dependencies: Dependency[], blocks: AsyncDependenciesBlock[] }>} */
		this._deferredStaleReferences = new Map();
		// context each entry dependency was factorized with; an entry has no importer to
		// recover it from, and it is not always the compiler's (see HtmlModulesPlugin)
		/** @type {WeakMap<Dependency, string>} */
		this._entryContexts = previous
			? previous._incremental._entryContexts
			: new WeakMap();
		/** @type {WeakMap<Dependency, EntryOptions["layer"]>} */
		this._entryLayers = previous
			? previous._incremental._entryLayers
			: new WeakMap();
		// restores released parsers of persisted modules built during make seeding
		/** @type {NormalModuleFactory | undefined} */
		this._normalModuleFactory = undefined;
		// true while Compiler runs the make hook; used for entry provenance
		this._inMakeHookWindow = false;
		// set by a seal that snapshotted the base sets and started the journal
		this._ready = false;
		// re-factorization resolved to a new module — the orphaned old one is pruned
		this._refactorReplaced = false;
		// per-module factory resolve dependencies, folded into the build snapshot so
		// needBuild catches a changed loader resolution; WeakMap — dies with module
		/** @type {WeakMap<Module, { fileDependencies?: LazySet<string> | Set<string>, contextDependencies?: LazySet<string> | Set<string>, missingDependencies?: LazySet<string> | Set<string> }>} */
		this.moduleResolveDependencies = previous
			? previous._incremental.moduleResolveDependencies
			: new WeakMap();
		// Resolution probes can arrive after a module's build snapshot was captured.
		/** @type {Map<Module, ResolveDependencies>} */
		this._resolveDependencies = new Map();
	}

	/**
	 * @param {Compiler} compiler compiler starting a compilation
	 * @returns {Compilation | undefined} reusable compilation
	 */
	static getPrevious(compiler) {
		const previous = compiler._lastCompilation;
		return previous !== undefined && previous._incremental.canReuse()
			? previous
			: undefined;
	}

	/**
	 * @returns {boolean} whether this compilation prepared its graph for reuse
	 */
	canReuse() {
		return (
			this._compilation.compiler.watchMode &&
			!this._state.disabled &&
			this._ready
		);
	}

	/**
	 * Build-time loading or execution creates transient roots, disabling graph reuse.
	 * @returns {void}
	 */
	disable() {
		this._state.disabled = true;
	}

	/**
	 * @param {NormalModuleFactory} normalModuleFactory current factory
	 * @param {(err?: Error | null) => void} callback completion callback
	 * @returns {void}
	 */
	make(normalModuleFactory, callback) {
		if (this.rebuilding) {
			this._normalModuleFactory = normalModuleFactory;
			// Importer-driven builds can replace dependencies outside the make hook.
			// Preserve their old connections before the build replaces them.
			this._compilation.hooks.buildModule.tap("Incremental", (module) => {
				if (
					!this._newModules.has(module) &&
					!this._deferredStaleReferences.has(module)
				) {
					this._deferredStaleReferences.set(module, {
						dependencies: [...module.dependencies],
						blocks: [...module.blocks]
					});
				}
			});
			const { moduleGraph, modules } = this._compilation;
			moduleGraph.unfreeze();
			moduleGraph.removeAllModuleAttributes();
			/** @type {Set<string>} */
			const moduleTypes = new Set();
			for (const module of modules) {
				moduleTypes.add(module.type);
				const meta = moduleGraph.getMetaIfExisting(module);
				if (meta !== undefined) {
					if (meta.importVarMap !== undefined) meta.importVarMap.clear();
					if (meta.deferredImportVarMap !== undefined) {
						meta.deferredImportVarMap.clear();
					}
				}
				// Reset before finishModules so library plugins can mark entry exports
				// as used without the usage analysis clearing those marks again.
				moduleGraph.getExportsInfo(module)._resetUsedExports();
			}
			// Retained modules bypass factorization, which normally prepares their
			// dependency factories and templates for the new compilation.
			asyncLib.each(
				[...moduleTypes],
				(type, done) => normalModuleFactory._prepareModuleType(type, done),
				(err) => {
					if (err) return callback(err);
					this._inMakeHookWindow = true;
					this._compilation.compiler.hooks.make.callAsync(
						this._compilation,
						(err) => {
							this._inMakeHookWindow = false;
							if (err) return callback(err);
							this._rebuild(normalModuleFactory, callback);
						}
					);
				}
			);
		} else {
			this._inMakeHookWindow = true;
			this._compilation.compiler.hooks.make.callAsync(
				this._compilation,
				(err) => {
					this._inMakeHookWindow = false;
					callback(err);
				}
			);
		}
	}

	/**
	 * @param {Module} module module newly added to the compilation
	 * @returns {void}
	 */
	addModule(module) {
		if (this.rebuilding) this._newModules.add(module);
	}

	/**
	 * @param {Module} module module whose dependencies would be processed
	 * @returns {boolean} whether its existing dependency connections can be reused
	 */
	canReuseDependencies(module) {
		if (
			!this.rebuilding ||
			this._newModules.has(module) ||
			this._compilation.builtModules.has(module)
		) {
			return false;
		}
		// Lazy barrels must still un-lazy targets newly requested by an importer.
		const factoryMeta = module.factoryMeta;
		return factoryMeta === undefined || !factoryMeta.sideEffectFree;
	}

	/**
	 * @param {Module} module module being checked for a rebuild
	 * @returns {void}
	 */
	prepareModule(module) {
		// a persisted module built during make seeding lost its parser after the
		// previous seal — restore it before the build needs it
		if (
			this.rebuilding &&
			this._normalModuleFactory !== undefined &&
			/** @type {{ parser?: import("../module/Parser") }} */ (module).parser ===
				undefined
		) {
			module._restoreParserAndGenerator(this._normalModuleFactory);
		}
	}

	/**
	 * @param {Module} module rebuilt module
	 * @returns {void}
	 */
	finishModule(module) {
		module._incrementalResolveSnapshot = undefined;
		if (this._deferredStaleReferences.size > 0) {
			const staleReferences = this._deferredStaleReferences.get(module);
			if (staleReferences !== undefined) {
				// deferred re-factorize: purge the pre-rebuild connections the
				// direct path removes via its own cleanup
				this._deferredStaleReferences.delete(module);
				this.removePreRebuildConnections(module, staleReferences);
			}
		}
		if (
			this.rebuilding &&
			module.factoryMeta &&
			module.factoryMeta.sideEffectFree
		) {
			// a rebuilt barrel's deferred re-exports have no importer walk
			// to un-lazy them (persisted importers are not re-walked) —
			// factorize them eagerly for this build
			for (const dependency of module.dependencies) {
				if ("setLazy" in dependency) {
					/** @type {Dependency & { setLazy: (lazy: boolean) => void }} */ (
						dependency
					).setLazy(false);
				}
			}
		}
	}

	/**
	 * @param {string} context entry context
	 * @param {Dependency} entry entry dependency
	 * @param {"dependencies" | "includeDependencies"} target entry collection
	 * @param {EntryOptions} options entry options
	 * @param {EntryData | undefined} entryData existing entry
	 * @returns {Dependency | undefined} connected entry dependency to reuse
	 */
	addEntry(context, entry, target, options, entryData) {
		// entries persist in the graph; re-running entry plugins must not duplicate
		// the entry dependency — return the existing module instead
		if (this.rebuilding && entryData !== undefined) {
			const touchedEntries = /** @type {Set<Dependency>} */ (
				this._touchedEntries
			);
			const touchedEntryData =
				/** @type {Set<EntryData>} */
				(this._touchedEntryData);
			if (!touchedEntryData.has(entryData)) {
				touchedEntryData.add(entryData);
				// a fresh make would rebuild the options from scratch — mirror that
				entryData.options = { name: undefined, ...options };
			}
			const resourceIdentifier = entry.getResourceIdentifier();
			const layer =
				options.layer === undefined ? entryData.options.layer : options.layer;
			const existing = entryData[target].find(
				(candidate) =>
					candidate.constructor === entry.constructor &&
					this._entryContexts.get(candidate) === context &&
					this._entryLayers.get(candidate) === layer &&
					!touchedEntries.has(candidate) &&
					(resourceIdentifier === null
						? candidate === entry
						: candidate.getResourceIdentifier() === resourceIdentifier)
			);
			if (existing !== undefined) {
				const existingModule =
					this._compilation.moduleGraph.getModule(existing);
				if (existingModule) {
					// Moving reused dependencies to the end preserves this make's order,
					// including new entries inserted between retained ones.
					entryData[target].splice(entryData[target].indexOf(existing), 1);
					entryData[target].push(existing);
					touchedEntries.add(existing);
					if (this._inMakeHookWindow) {
						this._state.configEntryDependencies.add(existing);
					}
					return existing;
				}
				// never resolved (a failed entry) — drop the stale dependency and factorize
				// a fresh one below so it can retry
				const dependencyIndex = entryData[target].indexOf(existing);
				if (dependencyIndex !== -1) {
					entryData[target].splice(dependencyIndex, 1);
				}
			}
			const previousContext = this._entryContexts.get(entry);
			if (previousContext !== undefined && previousContext !== context) {
				const dependencyIndex = entryData[target].indexOf(entry);
				if (dependencyIndex !== -1) {
					// The same dependency object now roots a different resolution.
					entryData[target].splice(dependencyIndex, 1);
					this._compilation.moduleGraph._removeConnectionLoose(entry);
					this._entriesDropped = true;
				}
			}
		}
		this._entryContexts.set(entry, context);
		this._entryLayers.set(
			entry,
			options.layer === undefined && entryData
				? entryData.options.layer
				: options.layer
		);
		if (this._touchedEntries !== undefined) {
			this._touchedEntries.add(entry);
		}
		if (
			this._compilation.compiler.watchMode &&
			!this._state.disabled &&
			this._inMakeHookWindow
		) {
			this._state.configEntryDependencies.add(entry);
		}
		return undefined;
	}

	/**
	 * @param {Module} module resolved module
	 * @param {Module | null | undefined} originModule importing module
	 * @param {Dependency[]} dependencies dependencies being resolved
	 * @param {boolean | undefined} reusedDependencies whether the dependencies were retained
	 * @returns {void}
	 */
	setIssuer(module, originModule, dependencies, reusedDependencies) {
		const moduleGraph = this._compilation.moduleGraph;
		if (
			this.rebuilding &&
			(originModule === null || originModule === undefined)
		) {
			// re-seeded root: force the issuer to null like a full make and record
			// it so the prune keeps it a root
			moduleGraph.setIssuer(module, null);
			this._seedRoots.add(module);
			// Fresh prefetch seeds replace old connections to prevent accumulation.
			// Re-factorization keeps its dependency, so removing those connections
			// would drop sibling entries pointing at the same module.
			if (dependencies.length > 0 && !reusedDependencies) {
				moduleGraph._removeStaleSeedConnections(module, dependencies);
			}
		} else {
			moduleGraph.setIssuerIfUnset(
				module,
				originModule !== undefined ? originModule : null
			);
		}
	}

	/**
	 * @param {Module} module resolved module
	 * @param {Module | null | undefined} originModule importing module
	 * @param {ModuleFactoryResult} factoryResult factory result
	 * @returns {void}
	 */
	recordResolveDependencies(module, originModule, factoryResult) {
		// track where this dependency resolved for the needBuild scan
		if (this._compilation.compiler.watchMode && !this._state.disabled) {
			if (module.buildInfo !== undefined) {
				this._addResolveDependencies(module, factoryResult);
			}
			let missingDependencies = factoryResult.missingDependencies;
			// a loader's package.json can change which loader file is used — fold
			// its file/context dependencies into the module's snapshot (missing: see below)
			if (
				factoryResult.fileDependencies ||
				factoryResult.contextDependencies ||
				missingDependencies
			) {
				let { fileDependencies, contextDependencies } = factoryResult;
				const previous = this.moduleResolveDependencies.get(module);
				// Multiple requests can resolve to the same module; a cached result
				// with empty dependencies must not erase an earlier resolution.
				if (previous !== undefined) {
					/** @type {LazySet<string>} */
					const files = new LazySet();
					if (previous.fileDependencies) {
						files.addAll(previous.fileDependencies);
					}
					if (fileDependencies) files.addAll(fileDependencies);
					fileDependencies = files;
					/** @type {LazySet<string>} */
					const contexts = new LazySet();
					if (previous.contextDependencies) {
						contexts.addAll(previous.contextDependencies);
					}
					if (contextDependencies) contexts.addAll(contextDependencies);
					contextDependencies = contexts;
					/** @type {LazySet<string>} */
					const missing = new LazySet();
					if (previous.missingDependencies) {
						missing.addAll(previous.missingDependencies);
					}
					if (missingDependencies) missing.addAll(missingDependencies);
					missingDependencies = missing;
				}
				this.moduleResolveDependencies.set(module, {
					fileDependencies,
					contextDependencies,
					missingDependencies
				});
			}
			// where the origin's dependency resolved can change with no edit to the
			// origin; its build snapshot predates this factorization
			if (
				originModule !== null &&
				originModule !== undefined &&
				missingDependencies
			) {
				this._addResolveDependencies(originModule, {
					missingDependencies
				});
			}
		}
	}

	/**
	 * Collect resolution dependencies outside the module's build snapshot.
	 * @private
	 * @param {Module} module the module to invalidate when the resolution changes
	 * @param {ModuleFactoryResult} factoryResult the factory result carrying the resolve dependencies
	 * @returns {void}
	 */
	_addResolveDependencies(module, factoryResult) {
		let dependencies = this._resolveDependencies.get(module);
		for (const key of /** @type {const} */ ([
			"fileDependencies",
			"contextDependencies",
			"missingDependencies"
		])) {
			const values = factoryResult[key];
			if (!values || values.size === 0) continue;
			if (dependencies === undefined) {
				dependencies = {};
				this._resolveDependencies.set(module, dependencies);
			}
			let collected = dependencies[key];
			if (collected === undefined) {
				collected = dependencies[key] = new LazySet();
			}
			collected.addAll(values);
		}
	}

	/**
	 * Drop file and context probes incorporated into the module's build snapshot.
	 * @param {Module} module module capturing its build snapshot
	 * @returns {void}
	 */
	consumeResolveDependencies(module) {
		const dependencies = this._resolveDependencies.get(module);
		if (dependencies === undefined) return;
		dependencies.fileDependencies = undefined;
		dependencies.contextDependencies = undefined;
		if (dependencies.missingDependencies === undefined) {
			this._resolveDependencies.delete(module);
		}
	}

	/**
	 * Snapshot resolution probes not captured by module builds.
	 * @param {(err?: WebpackError | null) => void} callback signals completion
	 * @returns {void}
	 */
	finish(callback) {
		if (this._state.disabled || this._resolveDependencies.size === 0) {
			return callback();
		}
		const snapshotOptions = this._compilation.options.snapshot.resolve;
		const startTime =
			this._compilation.compiler.fsStartTime || this._compilation.startTime;
		asyncLib.each(
			[...this._resolveDependencies],
			([module, dependencies], done) => {
				// Re-factorizing one target must keep the probes of the origin's
				// other dependencies. A rebuilt origin clears its old snapshot.
				const previousSnapshot = module._incrementalResolveSnapshot;
				this._compilation.fileSystemInfo.createSnapshot(
					startTime,
					dependencies.fileDependencies,
					dependencies.contextDependencies,
					dependencies.missingDependencies,
					snapshotOptions,
					(err, snapshot) => {
						if (err) return done(err);
						if (snapshot !== null) {
							if (previousSnapshot !== undefined) {
								snapshot = this._compilation.fileSystemInfo.mergeSnapshots(
									previousSnapshot,
									snapshot
								);
							}
							this._compilation.fileDependencies.addAll(
								snapshot.getFileIterable()
							);
							this._compilation.contextDependencies.addAll(
								snapshot.getContextIterable()
							);
							this._compilation.missingDependencies.addAll(
								snapshot.getMissingIterable()
							);
						}
						module._incrementalResolveSnapshot =
							snapshot === null ? undefined : snapshot;
						done();
					}
				);
			},
			(err) => {
				// snapshots now live on the durable modules; drop the per-make dependencies map
				this._resolveDependencies.clear();
				callback(/** @type {WebpackError | null | undefined} */ (err));
			}
		);
	}

	/**
	 * Incremental make (incremental rebuilds): against the persisted module
	 * graph, detect modules whose inputs changed and rebuild only those. New
	 * dependencies discovered during rebuild are factorized and built through the
	 * normal queues; the full O(N) entry re-walk is skipped.
	 * @param {NormalModuleFactory} normalModuleFactory the normal module factory
	 * @param {(err?: Error | null) => void} callback signals when incremental make finishes
	 * @returns {void}
	 */
	_rebuild(normalModuleFactory, callback) {
		// undo the previous seal's graph mutations (concatenation)
		this._compilation.moduleGraph._restoreFromMutationJournal();
		// drop the previous seal's synthetic modules (see constructor note)
		if (this._previousSealModules !== undefined) {
			for (const module of this._previousSealModules) {
				if (!this._compilation.modules.has(module)) {
					this._compilation.moduleGraph._removeModule(module);
				}
			}
			this._previousSealModules = undefined;
		}
		// drop persisted entry dependencies this make's entry plugins did not re-add
		// (a dynamic entry disappeared) — else their modules stay rooted forever
		let entriesDropped = this._entriesDropped;
		const touchedEntries =
			/** @type {Set<Dependency>} */
			(this._touchedEntries);
		const configEntryDependencies = this._state.configEntryDependencies;
		/**
		 * @param {EntryData} entryData retained entry
		 * @returns {void}
		 */
		const reconcileEntryData = (entryData) => {
			for (const target of ["dependencies", "includeDependencies"]) {
				const dependencies =
					entryData[
						/** @type {"dependencies" | "includeDependencies"} */ (target)
					];
				// Only make-hook entries are re-added every build. finishMake entries
				// persist, including stale entries their originator stopped adding:
				// removing those needs originator linkage only the adding plugin has.
				const kept = dependencies.filter(
					(candidate) =>
						!configEntryDependencies.has(candidate) ||
						touchedEntries.has(candidate)
				);
				if (kept.length !== dependencies.length) {
					entriesDropped = true;
					dependencies.length = 0;
					for (const candidate of kept) dependencies.push(candidate);
				}
			}
		};
		reconcileEntryData(this._compilation.globalEntry);
		for (const [name, entryData] of this._compilation.entries) {
			reconcileEntryData(entryData);
			if (
				entryData.dependencies.length === 0 &&
				entryData.includeDependencies.length === 0
			) {
				this._compilation.entries.delete(name);
				entriesDropped = true;
			}
		}
		if (entriesDropped) {
			// removed roots change reachability and chunk structure
			this._pruneUnreachableModules();
		}
		// the side-effects walk memoizes per graph object; the reused graph would
		// keep stale states across rebuilds, so drop the memo before building
		for (const module of this._compilation.modules) {
			const normalModule = /** @type {NormalModule} */ (module);
			if (normalModule._sideEffectsStateGraph !== undefined) {
				normalModule._sideEffectsStateGraph = undefined;
				normalModule._sideEffectsStateValue = undefined;
			}
		}
		const context = {
			compilation: this._compilation,
			fileSystemInfo: this._compilation.fileSystemInfo,
			valueCacheVersions: this._compilation.valueCacheVersions
		};
		const { modifiedFiles, removedFiles } = this._compilation.compiler;
		/** @type {Module[]} */
		const changed = [];
		asyncLib.each(
			[...this._compilation.modules],
			(module, done) => {
				module.needBuild(context, (err, need) => {
					if (err) return done(err);
					if (need) {
						changed.push(module);
						return done();
					}
					// unchanged inputs can still need a rebuild if WHERE a dependency
					// resolved changed — the resolve snapshot covers those probes
					const resolveSnapshot = module._incrementalResolveSnapshot;
					if (resolveSnapshot !== undefined) {
						// Managed snapshots can validate stale missing paths even after
						// the watcher reports their creation or removal.
						for (const dependency of resolveSnapshot.getMissingIterable()) {
							if (
								(modifiedFiles && modifiedFiles.has(dependency)) ||
								(removedFiles && removedFiles.has(dependency))
							) {
								changed.push(module);
								return done();
							}
						}
						this._compilation.fileSystemInfo.checkSnapshotValid(
							resolveSnapshot,
							(rebuildError, valid) => {
								if (rebuildError) return done(rebuildError);
								if (valid) {
									this._compilation.fileDependencies.addAll(
										resolveSnapshot.getFileIterable()
									);
									this._compilation.contextDependencies.addAll(
										resolveSnapshot.getContextIterable()
									);
									this._compilation.missingDependencies.addAll(
										resolveSnapshot.getMissingIterable()
									);
									this._compilation._lazyBarrels.classify(module);
								} else {
									changed.push(module);
								}
								done();
							}
						);
						return;
					}
					// unchanged barrels are never processed here — classify so a newly
					// imported deferred re-export can still un-lazy
					this._compilation._lazyBarrels.classify(module);
					done();
				});
			},
			(err) => {
				if (err) return callback(err);
				// Snapshot checks can cache failed reads of removed files before their
				// modules are pruned. Those paths may no longer be watched on restoration.
				const { compiler, inputFileSystem } = this._compilation;
				if (compiler.removedFiles && inputFileSystem.purge) {
					for (const filename of compiler.removedFiles) {
						inputFileSystem.purge(filename, { exact: true });
					}
				}
				// retry factorization failures; still-failing ones re-register
				if (this.errorModules.size > 0) {
					const retry = [...this.errorModules];
					this.errorModules.clear();
					const changedSet = new Set(changed);
					for (const referencedModule of retry) {
						if (
							this._compilation.modules.has(referencedModule) &&
							!changedSet.has(referencedModule)
						) {
							changed.push(referencedModule);
						}
					}
				}
				this._compilation.logger.log(
					`incremental make: ${changed.length} of ${this._compilation.modules.size} module(s) changed`
				);
				// build-time execution reads provided exports during make — reset changed
				// modules so `export *` re-exports the fresh set
				for (const referencedModule of changed) {
					this._compilation.moduleGraph
						.getExportsInfo(referencedModule)
						._resetProvidedExports();
				}
				if (changed.length === 0) return callback();
				this._compilation.moduleGraph.unfreeze();
				// shape key over dependencies + blocks: catches added/removed/changed
				// imports and export name changes (which affect dependents)
				/**
				 * @param {Dependency[]} dependencies dependencies to encode
				 * @param {string[]} parts shape key parts
				 * @returns {void}
				 */
				const pushDependencies = (dependencies, parts) => {
					for (const dependency of dependencies) {
						const candidate =
							/** @type {Dependency & { ids?: string[], id?: string | number, request?: string, name?: string }} */ (
								dependency
							);
						const ids = Array.isArray(candidate.ids)
							? candidate.ids.join(".")
							: candidate.id || "";
						parts.push(
							`${dependency.constructor.name}::${candidate.request || ""}::${
								candidate.name || ""
							}::${ids}`
						);
					}
				};
				/**
				 * @param {AsyncDependenciesBlock[]} blocks blocks to encode
				 * @param {string[]} parts shape key parts
				 * @returns {void}
				 */
				const pushBlocks = (blocks, parts) => {
					for (const block of blocks) {
						parts.push(`##${block.dependencies.length}`);
						pushDependencies(block.dependencies, parts);
						if (block.blocks.length > 0) pushBlocks(block.blocks, parts);
					}
				};
				/**
				 * @param {Module} module module to encode
				 * @returns {string} dependency shape
				 */
				const shapeKey = (module) => {
					/** @type {string[]} */
					const parts = [];
					pushDependencies(module.dependencies, parts);
					pushBlocks(module.blocks, parts);
					return parts.join("|");
				};
				/** @type {Map<Module, string>} */
				const shapeBefore = new Map();
				for (const module of changed) {
					shapeBefore.set(module, shapeKey(module));
				}
				this._refactorReplaced = false;
				const changedSet = new Set(changed);
				asyncLib.each(
					changed,
					(module, done) => {
						// re-factorize so a changed loader/scheme/resolve result is picked up
						this._refactorizeModule(
							module,
							normalModuleFactory,
							changedSet,
							done
						);
					},
					(err) => {
						if (err) return callback(err);
						this._deferredStaleReferences.clear();
						let shapeChanged = false;
						for (const module of changed) {
							if (shapeKey(module) !== shapeBefore.get(module)) {
								shapeChanged = true;
								break;
							}
						}
						// a re-resolution to a new module orphans the old one — prune it
						if (this._refactorReplaced) shapeChanged = true;
						// a full make only ever contains reachable modules — prune or they
						// linger, get rebuilt and error on now-missing files
						if (shapeChanged) this._pruneUnreachableModules();
						callback();
					}
				);
			}
		);
	}

	/**
	 * Detaches unreachable modules after all rebuilds settle, preserving the objects
	 * for unsafe-cache reuse.
	 * @private
	 * @returns {void}
	 */
	_pruneUnreachableModules() {
		const moduleGraph = this._compilation.moduleGraph;
		/** @type {Set<Module>} */
		const reachable = new Set();
		/**
		 * @param {Dependency[]} dependencies root dependencies
		 * @returns {void}
		 */
		const addRoots = (dependencies) => {
			for (const dependency of dependencies) {
				const referencedModule = moduleGraph.getModule(dependency);
				if (referencedModule && !reachable.has(referencedModule)) {
					reachable.add(referencedModule);
					// entry-reached modules have no issuer (matches a full make)
					moduleGraph.setIssuer(referencedModule, null);
				}
			}
		};
		addRoots(this._compilation.globalEntry.dependencies);
		addRoots(this._compilation.globalEntry.includeDependencies);
		for (const {
			dependencies,
			includeDependencies
		} of this._compilation.entries.values()) {
			addRoots(dependencies);
			addRoots(includeDependencies);
		}
		// prefetch/root chains re-seeded this compilation are roots too (issuer null)
		for (const module of this._seedRoots) {
			if (this._compilation.modules.has(module) && !reachable.has(module)) {
				reachable.add(module);
				moduleGraph.setIssuer(module, null);
			}
		}
		// Set iteration visits newly added modules, following every connection
		// like assignDepths. Reset issuers to the first importer reached so graph
		// changes cannot leave cycles of persisted issuers.
		for (const module of reachable) {
			const connections = moduleGraph.getOutgoingConnectionsByModule(module);
			if (connections !== undefined) {
				for (const referencedModule of connections.keys()) {
					if (referencedModule && !reachable.has(referencedModule)) {
						reachable.add(referencedModule);
						moduleGraph.setIssuer(referencedModule, module);
					}
				}
			}
		}
		for (const module of this._compilation.modules) {
			if (reachable.has(module)) continue;
			// Detached inputs stop being watched, so later edits cannot purge
			// their cached reads before the module is imported again.
			const { inputFileSystem } = this._compilation;
			if (inputFileSystem.purge) {
				/** @type {LazySet<string>} */
				const files = new LazySet();
				/** @type {LazySet<string>} */
				const contexts = new LazySet();
				module.addCacheDependencies(files, contexts, files, new LazySet());
				for (const file of files) {
					inputFileSystem.purge(file, { exact: true });
				}
				for (const context of contexts) inputFileSystem.purge(context);
			}
			// Unwatched inputs can retain timestamps from before they were detached.
			module.invalidateBuild();
			this._compilation.modules.delete(module);
			this._modulesMap.delete(module.identifier());
			moduleGraph._removeModule(module);
		}
	}

	/**
	 * Re-runs the factory to refresh resolution and factory metadata for changed modules.
	 * Groups matching requests from each importer, deferring those with rebuilding importers.
	 * @param {Module} module module to re-factorize and rebuild
	 * @param {NormalModuleFactory} normalModuleFactory the normal module factory
	 * @param {Set<Module>} changedSet all modules being rebuilt concurrently
	 * @param {ModuleCallback} callback callback when finished; passes the original module
	 * @returns {void}
	 */
	_refactorizeModule(module, normalModuleFactory, changedSet, callback) {
		// Normal modules can retain stale factory metadata after package.json
		// changes, even without loaders. Other modules rebuild themselves.
		if (!(module instanceof getNormalModule())) {
			module._restoreParserAndGenerator(normalModuleFactory);
			return this._compilation._rebuildModule(module, callback);
		}
		const moduleGraph = this._compilation.moduleGraph;
		/** @type {{ dependencies: Dependency[], originModule: Module | null, factory: ModuleFactory }[]} */
		const references = [];
		/** @type {Map<Module, Map<ModuleFactory, Map<string, Map<string, Dependency[]>>>>} */
		const groups = new Map();
		let hasRebuildingImporter = false;
		for (const connection of moduleGraph.getIncomingConnections(module)) {
			const candidate = connection.dependency;
			if (
				candidate === undefined ||
				candidate === null ||
				!candidate.constructor
			) {
				continue;
			}
			// a concurrently rebuilding importer may replace this dependency
			// mid-flight and the re-factorization would reattach a stale connection
			if (connection.originModule && changedSet.has(connection.originModule)) {
				hasRebuildingImporter = true;
				continue;
			}
			const factory = this._compilation.dependencyFactories.get(
				/** @type {DependencyConstructor} */ (candidate.constructor)
			);
			if (factory !== undefined) {
				const dependencies = [candidate];
				const resourceIdentifier = candidate.getResourceIdentifier();
				if (
					connection.originModule &&
					resourceIdentifier !== null &&
					resourceIdentifier !== undefined
				) {
					const factories = getOrInsert(
						groups,
						connection.originModule,
						/** @returns {Map<ModuleFactory, Map<string, Map<string, Dependency[]>>>} requests by factory */
						() => new Map()
					);
					const categories = getOrInsert(
						factories,
						factory,
						/** @returns {Map<string, Map<string, Dependency[]>>} requests by category */
						() => new Map()
					);
					const resources = getOrInsert(
						categories,
						candidate.category,
						/** @returns {Map<string, Dependency[]>} dependencies by resource */
						() => new Map()
					);
					const existing = resources.get(resourceIdentifier);
					if (existing !== undefined) {
						existing.push(candidate);
						continue;
					}
					resources.set(resourceIdentifier, dependencies);
				}
				references.push({
					dependencies,
					originModule: connection.originModule,
					factory
				});
			}
		}
		if (references.length === 0) {
			if (hasRebuildingImporter) {
				// The rebuilding importer re-factorizes through the full pipeline,
				// including scheme version hooks. Force a build so a still-valid build
				// snapshot cannot skip dependencies after resolve-snapshot invalidation.
				module.invalidateBuild();
				// that walk replaces the dependencies without this path's cleanup — record
				// the old ones so the build callback can purge their connections
				this._deferredStaleReferences.set(module, {
					dependencies: [...module.dependencies],
					blocks: [...module.blocks]
				});
				return callback(null, module);
			}
			// no factorizable incoming dependency (unusual) — plain rebuild
			module._restoreParserAndGenerator(normalModuleFactory);
			return this._compilation._rebuildModule(module, callback);
		}
		this._deferredStaleReferences.set(module, {
			dependencies: [...module.dependencies],
			blocks: [...module.blocks]
		});
		this._compilation.hooks.rebuildModule.call(module);
		module.invalidateBuild();
		this._compilation.buildQueue.invalidate(module);
		this._compilation.processDependenciesQueue.invalidate(module);
		this._compilation.moduleGraph.unfreeze();
		asyncLib.each(
			references,
			({ dependencies, originModule, factory }, done) => {
				const dependency = dependencies[0];
				const entryLayer = originModule
					? undefined
					: this._entryLayers.get(dependency);
				// Detach every old resolution, including optional dependencies whose
				// failed factory reports a warning without returning an error.
				for (const candidate of dependencies) {
					moduleGraph._removeConnectionLoose(candidate);
				}
				this._compilation.handleModuleCreation(
					{
						factory,
						dependencies,
						originModule,
						contextInfo: entryLayer ? { issuerLayer: entryLayer } : undefined,
						context:
							dependency.getContext() ||
							(originModule ? undefined : this._entryContexts.get(dependency)),
						connectOrigin: originModule !== null,
						reusedDependencies: true
					},
					(err, newModule) => {
						if (newModule !== module) this._refactorReplaced = true;
						// The factory records diagnostics; only bail makes them fatal.
						done(this._compilation.bail ? err : null);
					}
				);
			},
			(err) => {
				// pairs with hooks.rebuildModule above (keyed by the original module)
				this._compilation.hooks.finishRebuildingModule.callAsync(
					module,
					(rebuildError) => {
						if (err) return callback(/** @type {WebpackError} */ (err));
						if (rebuildError) {
							return callback(
								makeWebpackError(
									rebuildError,
									"Compilation.hooks.finishRebuildingModule"
								)
							);
						}
						callback(null, module);
					}
				);
			}
		);
	}

	/**
	 * Removes a rebuilt module's pre-rebuild reasons and, on incremental
	 * rebuilds, the stale outgoing connections (incl. inactive ones) the
	 * dependency-keyed removal misses.
	 * @param {Module} module the rebuilt module
	 * @param {{ dependencies: Dependency[], blocks: AsyncDependenciesBlock[] }} staleReferences pre-rebuild dependencies and blocks
	 * @returns {void}
	 */
	removePreRebuildConnections(module, staleReferences) {
		this._compilation.removeReasonsOfDependencyBlock(module, staleReferences);
		if (!this.rebuilding) return;
		/** @type {Set<Dependency>} */
		const staleDependencies = new Set(staleReferences.dependencies);
		/**
		 * @param {AsyncDependenciesBlock[]} blocks old dependency blocks
		 * @returns {void}
		 */
		const collectBlockDependencies = (blocks) => {
			for (const block of blocks) {
				for (const candidate of block.dependencies) {
					staleDependencies.add(candidate);
				}
				if (block.blocks) collectBlockDependencies(block.blocks);
			}
		};
		collectBlockDependencies(staleReferences.blocks);
		this._compilation.moduleGraph._removeStaleOutgoingConnections(
			module,
			staleDependencies
		);
	}

	/**
	 * Capture the end-of-make graph once, including when seal is re-entered.
	 * @returns {void}
	 */
	seal() {
		// needAdditionalSeal re-enters seal: the base must stay the end-of-make
		// set and the journal must keep the mutations of the earlier pass
		if (
			this._compilation.compiler.watchMode &&
			!this._state.disabled &&
			!this._ready
		) {
			// snapshot the clean end-of-make base before seal mutates the module set
			this.baseModules = new Set(this._compilation.modules);
			this.baseModulesMap = new Map(this._modulesMap);
			// record seal-time graph mutations so the next rebuild can reverse them
			this._compilation.moduleGraph._startMutationJournal();
			this._ready = true;
		}
	}

	/**
	 * Release parsers whose hooks retain the finished compilation.
	 * @returns {void}
	 */
	releaseParsers() {
		if (
			this._compilation.compiler.watchMode &&
			!this._state.disabled &&
			this.baseModules !== undefined
		) {
			for (const module of this.baseModules) {
				module._cleanupParserForCache();
			}
		}
	}
}

module.exports = Incremental;
