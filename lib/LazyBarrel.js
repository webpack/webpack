/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const Dependency = require("./Dependency");

/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Compilation").DependencyConstructor} DependencyConstructor */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleFactory")} ModuleFactory */

/**
 * Defines the deferred request group type used by this module.
 * @typedef {object} DependencyGroup
 * @property {ModuleFactory} factory factory for the request
 * @property {Dependency[]} dependencies deferred dependencies of the request
 * @property {string | undefined} context request context
 */

/**
 * Defines the lazy barrel state type used by this module.
 * @typedef {object} LazyBarrelState
 * @property {Set<string> | true} forwardedIds export names requested so far, true for all
 * @property {LazyBarrelInfo | undefined} lazyBarrelInfo deferred dependencies, undefined until classified
 */

/**
 * Defines the lazy barrel unlazy item type used by this module.
 * @typedef {object} UnlazyDependencyInfo
 * @property {ModuleFactory} factory factory for the request
 * @property {Dependency[]} dependencies deferred dependencies of the request
 * @property {string | undefined} context request context
 * @property {Module} originModule the lazy barrel module
 */

/**
 * Collects the export names a dependency group requests from its target.
 * @param {Dependency[]} dependencies dependency group resolving to one module
 * @returns {Set<string> | true} requested export names, true for all
 */
function getForwardedIds(dependencies) {
	/** @type {Set<string>} */
	const ids = new Set();
	for (const dependency of dependencies) {
		// TODO remove in webpack 6
		// It may be missing on custom dependency types not extending the base Dependency
		if (!("getForwardId" in dependency)) continue;

		const id = dependency.getForwardId();
		if (id === true) return true;
		if (id !== null) ids.add(id);
	}
	return ids;
}

/**
 * Tracks the deferred (not yet factorized/built) dependencies of a
 * side-effect-free barrel module and which export names resolve to them.
 */
class LazyBarrelInfo {
	constructor() {
		/** @type {Map<string, string>} forward id -> request key */
		this._forwardIdToRequest = new Map();
		/** @type {Map<string, DependencyGroup>} request key -> still-deferred group */
		this._requestToDepGroup = new Map();
		/** @type {Set<string> | undefined} locally provided export names */
		this._terminalIds = undefined;
		/** @type {Set<string> | undefined} request keys of star re-exports */
		this._fallbackRequests = undefined;
	}

	/**
	 * Defers a dependency under its request key.
	 * @param {string} requestKey request key
	 * @param {Dependency} dependency dependency to defer
	 * @param {ModuleFactory} factory factory for the request
	 * @param {string | undefined} context request context
	 */
	addLazy(requestKey, dependency, factory, context) {
		let group = this._requestToDepGroup.get(requestKey);
		if (group === undefined) {
			group = { factory, dependencies: [], context };
			this._requestToDepGroup.set(requestKey, group);
		}
		group.dependencies.push(dependency);
		dependency.setLazy(true);
	}

	/**
	 * Maps an export name to the request providing it.
	 * @param {string} id export name
	 * @param {string} requestKey request key
	 */
	addForwardId(id, requestKey) {
		this._forwardIdToRequest.set(id, requestKey);
	}

	/**
	 * Registers a locally provided export name.
	 * @param {string} id export name
	 */
	addTerminal(id) {
		if (this._terminalIds === undefined) this._terminalIds = new Set();
		this._terminalIds.add(id);
	}

	/**
	 * Registers a star re-export request key.
	 * @param {string} requestKey request key
	 */
	addFallback(requestKey) {
		if (this._fallbackRequests === undefined) {
			this._fallbackRequests = new Set();
		}
		this._fallbackRequests.add(requestKey);
	}

	/**
	 * Returns whether nothing is deferred.
	 * @returns {boolean} true, when no dependency is deferred
	 */
	isEmpty() {
		return this._requestToDepGroup.size === 0;
	}

	/**
	 * Removes and returns the groups needed to provide the requested export names.
	 * @param {Set<string> | true} forwardedIds requested export names, true for all
	 * @returns {DependencyGroup[]} groups that must be processed now
	 */
	request(forwardedIds) {
		/** @type {DependencyGroup[]} */
		const result = [];
		/**
		 * @param {DependencyGroup} group taken group
		 */
		const unlazy = (group) => {
			for (const dependency of group.dependencies) {
				dependency.setLazy(false);
			}
			result.push(group);
		};
		if (forwardedIds === true) {
			for (const group of this._requestToDepGroup.values()) unlazy(group);
			this._requestToDepGroup.clear();
			return result;
		}
		/**
		 * @param {string} requestKey request key to take
		 */
		const take = (requestKey) => {
			const group = this._requestToDepGroup.get(requestKey);
			if (group === undefined) return;
			this._requestToDepGroup.delete(requestKey);
			unlazy(group);
		};
		for (const id of forwardedIds) {
			if (this._terminalIds !== undefined && this._terminalIds.has(id)) {
				continue;
			}
			const requestKey = this._forwardIdToRequest.get(id);
			if (requestKey !== undefined) {
				take(requestKey);
			} else if (this._fallbackRequests !== undefined) {
				// unknown name: any star re-export may provide it
				for (const fallbackKey of this._fallbackRequests) take(fallbackKey);
			}
		}
		return result;
	}
}

const esmDependencyCategory = "esm";

/**
 * Owns the per side-effect-free module lazy barrel state for a `Compilation`,
 * keeping the deferral bookkeeping out of `Compilation` itself.
 */
class LazyBarrelController {
	/**
	 * @param {Compilation} compilation the owning compilation
	 */
	constructor(compilation) {
		this._compilation = compilation;
		/** @type {WeakMap<Module, LazyBarrelState>} */
		this._modules = new WeakMap();
	}

	/**
	 * Classifies the re-export dependencies of a side-effect-free module (lazy barrel)
	 * into deferrable groups and marks the deferred ones.
	 * @param {Module} module the module whose dependencies are processed
	 * @returns {boolean} true, when some dependencies were deferred
	 */
	classify(module) {
		const modules = this._modules;
		const factoryMeta = module.factoryMeta;
		if (factoryMeta === undefined || !factoryMeta.sideEffectFree) {
			return false;
		}
		const dependencyFactories = this._compilation.dependencyFactories;
		/** @type {LazyBarrelInfo | undefined} */
		let info;
		for (const dep of module.dependencies) {
			// TODO remove in webpack 6
			// It may be missing on custom dependency types not extending the base Dependency
			if (!("getLazyUntil" in dep && "setLazy" in dep)) continue;

			const until = dep.getLazyUntil();
			if (until === null) continue;
			if (info === undefined) info = new LazyBarrelInfo();
			if (typeof until === "object" && "local" in until) {
				info.addTerminal(until.local);
				continue;
			}
			const resourceIdent = dep.getResourceIdentifier();
			if (resourceIdent === null) continue;
			const factory = dependencyFactories.get(
				/** @type {DependencyConstructor} */ (dep.constructor)
			);
			if (factory === undefined) continue;
			const category = dep.category;
			// Match the request grouping key of `processDependencyForResolving`
			const requestKey =
				category === esmDependencyCategory
					? resourceIdent
					: `${category}${resourceIdent}`;
			info.addLazy(requestKey, dep, factory, dep.getContext());
			if (typeof until === "object") {
				info.addForwardId(until.id, requestKey);
			} else if (until === Dependency.LAZY_UNTIL_FALLBACK) {
				info.addFallback(requestKey);
			}
		}
		const state = modules.get(module);
		if (info === undefined || info.isEmpty()) {
			if (state !== undefined) modules.delete(module);
			return false;
		}
		if (state !== undefined) {
			// barrel classified after its targets were already requested: replay the
			// recorded ids so processDependency un-lazies and builds those targets now
			state.lazyBarrelInfo = info;
			info.request(state.forwardedIds);
			// stay lazy only while some targets remain deferred
			return !info.isEmpty();
		}

		modules.set(module, {
			forwardedIds: new Set(),
			lazyBarrelInfo: info
		});

		return true;
	}

	/**
	 * Requests the export names that `dependencies` need from a lazy barrel and
	 * returns the deferred re-export targets that must be built now. Records the
	 * request when the barrel's dependencies were not classified yet.
	 * @param {Module} module the resolved module
	 * @param {Dependency[]} dependencies the dependencies that resolved to the module
	 * @returns {UnlazyDependencyInfo[] | undefined} items to process, if any
	 */
	request(module, dependencies) {
		const modules = this._modules;
		const state = modules.get(module);

		if (state === undefined) {
			const factoryMeta = module.factoryMeta;
			if (factoryMeta === undefined || !factoryMeta.sideEffectFree) return;
			const forwardedIds = getForwardedIds(dependencies);
			if (forwardedIds !== true && forwardedIds.size === 0) return;
			modules.set(module, {
				forwardedIds,
				lazyBarrelInfo: undefined
			});
			return;
		}

		const forwardedIds = getForwardedIds(dependencies);
		if (forwardedIds !== true && forwardedIds.size === 0) return;
		if (state.forwardedIds !== true) {
			if (forwardedIds === true) state.forwardedIds = true;
			else for (const id of forwardedIds) state.forwardedIds.add(id);
		}
		const info = state.lazyBarrelInfo;
		// Pending requests will be replayed during `classify` later
		if (info === undefined) return;
		const groups = info.request(forwardedIds);
		if (groups.length === 0) return;
		return groups.map((group) => ({
			factory: group.factory,
			dependencies: group.dependencies,
			context: group.context,
			originModule: module
		}));
	}

	/**
	 * Queues the deferred dependency groups of a lazy barrel requested by a single dependency.
	 * @param {Module} module the resolved module of the dependency
	 * @param {Dependency} dependency the requesting dependency
	 * @param {{ factory: ModuleFactory, dependencies: Dependency[], context: string | undefined, originModule: Module | null }[]} sortedDependencies item list to append to
	 */
	unlazyForDependency(module, dependency, sortedDependencies) {
		const unlazyItems = this.request(module, [dependency]);
		if (unlazyItems === undefined) return;
		for (const item of unlazyItems) sortedDependencies.push(item);
	}
}

module.exports = LazyBarrelController;
