/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const Dependency = require("../graph/Dependency");

/** @import Compilation, { DependencyConstructor } from "../Compilation" */
/** @import { LazyUntil } from "../graph/Dependency" */
/** @import Module from "../module/Module" */
/** @import ModuleFactory from "../module/ModuleFactory" */

/**
 * Deferred dependencies sharing one request.
 * @typedef {object} DependencyGroup
 * @property {ModuleFactory} factory factory for the request
 * @property {Dependency[]} dependencies deferred dependencies of the request
 * @property {string | undefined} context request context
 */

/**
 * A deferred group to process now, with the barrel it belongs to.
 * @typedef {object} UnlazyDependencyInfo
 * @property {ModuleFactory} factory factory for the request
 * @property {Dependency[]} dependencies deferred dependencies of the request
 * @property {string | undefined} context request context
 * @property {Module} originModule the lazy barrel module
 */

/**
 * Per-module lazy barrel state.
 * @typedef {object} LazyBarrelState
 * @property {Set<string> | true} forwardedIds export names requested so far, true for all
 * @property {LazyBarrelInfo | undefined} lazyBarrelInfo deferred dependencies, undefined until classified
 */

/**
 * Result of requesting names from a lazy barrel.
 * @typedef {object} LazyBarrelRequest
 * @property {DependencyGroup[]} groups groups that must be processed now
 * @property {Set<string> | true | undefined} fallbackIds names only a star re-export may provide
 * @property {Module[] | undefined} fallbackTargets resolved star re-export targets to forward them to
 */

/** @type {Set<string>} */
const EMPTY_REQUESTS = new Set();

/**
 * Returns whether the module is side-effect-free.
 * @param {Module} module the module
 * @returns {boolean} true, when side-effect-free
 */
const isSideEffectFree = (module) => {
	const factoryMeta = module.factoryMeta;
	return factoryMeta !== undefined && Boolean(factoryMeta.sideEffectFree);
};

/**
 * Returns the lazy classification of a dependency.
 * @param {Dependency} dependency the dependency
 * @returns {LazyUntil | null | undefined} classification, undefined when unsupported
 */
const getLazyUntil = (dependency) =>
	// TODO in the next major release: remove the guard, custom dependencies must extend Dependency
	"getLazyUntil" in dependency ? dependency.getLazyUntil() : undefined;

/**
 * Returns the request key, matching the grouping of `processDependencyForResolving`.
 * @param {Dependency} dependency the dependency
 * @returns {string} request key
 */
const getRequestKey = (dependency) => {
	const resourceIdent = /** @type {string} */ (
		dependency.getResourceIdentifier()
	);
	const category = dependency.category;
	return category === Dependency.ESM_CATEGORY
		? resourceIdent
		: `${category}${resourceIdent}`;
};

/**
 * Returns the module requests of the import entries.
 * @param {Dependency[]} dependencies dependencies of the barrel
 * @returns {Set<string>} import entry requests
 */
const getImportEntryRequests = (dependencies) => {
	/** @type {Set<string>} */
	const requests = new Set();
	for (const dep of dependencies) {
		if (
			getLazyUntil(dep) !== null ||
			dep.category !== Dependency.ESM_CATEGORY
		) {
			continue;
		}
		const resourceIdent = dep.getResourceIdentifier();
		if (resourceIdent !== null) requests.add(resourceIdent);
	}
	return requests;
};

/**
 * Returns whether import declarations can be deferred: only names not provided locally were requested.
 * @param {Set<string> | true | undefined} forwardedIds names requested before classification
 * @param {Set<string>} localIds locally provided export names
 * @returns {boolean} true, when import declarations can be deferred
 */
const canDeferImports = (forwardedIds, localIds) => {
	if (
		forwardedIds === undefined ||
		forwardedIds === true ||
		forwardedIds.size === 0
	) {
		return false;
	}
	for (const id of forwardedIds) {
		if (localIds.has(id)) return false;
	}
	return true;
};

/**
 * Merges requested names into the state and returns those not requested before.
 * @param {LazyBarrelState} state the barrel state
 * @param {Set<string> | true} ids requested export names, true for all
 * @returns {Set<string> | true | undefined} new names, undefined when none
 */
const mergeForwardedIds = (state, ids) => {
	const forwardedIds = state.forwardedIds;
	if (forwardedIds === true) return;
	if (ids === true) {
		state.forwardedIds = true;
		return true;
	}
	/** @type {Set<string>} */
	const newIds = new Set();
	for (const id of ids) {
		if (forwardedIds.has(id)) continue;
		forwardedIds.add(id);
		newIds.add(id);
	}
	return newIds.size > 0 ? newIds : undefined;
};

/**
 * Deferred dependencies of a side-effect-free barrel and the export names activating them.
 */
class LazyBarrelInfo {
	constructor() {
		/** @type {Map<string, string | Set<string>> | undefined} export name -> request key(s) */
		this._forwardIdToRequest = undefined;
		/** @type {Map<string, DependencyGroup>} request key -> still-deferred group */
		this._requestToDepGroup = new Map();
		/** @type {Set<string> | undefined} star re-export requests */
		this._fallbackRequests = undefined;
		/** @type {Set<Module> | undefined} resolved star re-export targets */
		this._fallbackTargetModules = undefined;
	}

	/**
	 * Records a deferred dependency under its request key.
	 * @param {string} requestKey request key
	 * @param {Dependency} dependency dependency to defer
	 * @param {ModuleFactory} factory factory for the request
	 */
	addLazy(requestKey, dependency, factory) {
		let group = this._requestToDepGroup.get(requestKey);
		if (group === undefined) {
			group = { factory, dependencies: [], context: dependency.getContext() };
			this._requestToDepGroup.set(requestKey, group);
		}
		if (!group.dependencies.includes(dependency)) {
			group.dependencies.push(dependency);
		}
	}

	/**
	 * Maps an export name to the request(s) needed to provide it.
	 * @param {string} id export name
	 * @param {string | Set<string>} requestKeys request key, or the lazy import requests of a local export
	 */
	addForwardId(id, requestKeys) {
		if (this._forwardIdToRequest === undefined) {
			this._forwardIdToRequest = new Map();
		}
		this._forwardIdToRequest.set(id, requestKeys);
	}

	/**
	 * Registers a star re-export request.
	 * @param {string} requestKey request key
	 */
	addFallback(requestKey) {
		if (this._fallbackRequests === undefined) {
			this._fallbackRequests = new Set();
		}
		this._fallbackRequests.add(requestKey);
	}

	/**
	 * Records a resolved star re-export target, so later names reach it without re-factorizing.
	 * @param {Module} module the target module
	 */
	addFallbackTarget(module) {
		if (this._fallbackRequests === undefined) return;
		if (this._fallbackTargetModules === undefined) {
			this._fallbackTargetModules = new Set();
		}
		this._fallbackTargetModules.add(module);
	}

	/**
	 * Returns whether nothing is deferred.
	 * @returns {boolean} true, when no dependency is deferred
	 */
	isEmpty() {
		return this._requestToDepGroup.size === 0;
	}

	/**
	 * Returns the requests of the still-deferred groups.
	 * @returns {Iterable<string>} still-deferred requests
	 */
	getLazyRequests() {
		return this._requestToDepGroup.keys();
	}

	/**
	 * Activates the deferred groups needed to provide newly requested export names.
	 * @param {Set<string> | true} ids newly requested export names, true for all
	 * @returns {LazyBarrelRequest} activated groups and the names to forward to star targets
	 */
	request(ids) {
		/** @type {DependencyGroup[]} */
		const groups = [];
		/** @type {Set<string> | true | undefined} */
		let fallbackIds;
		if (ids === true) {
			for (const requestKey of this._requestToDepGroup.keys()) {
				this._take(requestKey, groups);
			}
			fallbackIds = true;
		} else {
			fallbackIds = this._takeIds(ids, groups);
		}
		const fallbackTargets =
			fallbackIds !== undefined && this._fallbackTargetModules !== undefined
				? [...this._fallbackTargetModules]
				: undefined;
		if (
			ids === true ||
			(this._requestToDepGroup.size === 0 &&
				this._fallbackRequests === undefined)
		) {
			this._release();
		}
		return { groups, fallbackIds, fallbackTargets };
	}

	/**
	 * Activates the groups providing `ids` and returns the names only a star re-export may provide.
	 * @param {Set<string>} ids requested export names
	 * @param {DependencyGroup[]} groups activated groups
	 * @returns {Set<string> | undefined} names no known export provides
	 */
	_takeIds(ids, groups) {
		/** @type {Set<string> | undefined} */
		let unknownIds;
		for (const id of ids) {
			const requestKeys =
				this._forwardIdToRequest === undefined
					? undefined
					: this._forwardIdToRequest.get(id);
			if (typeof requestKeys === "string") {
				this._take(requestKeys, groups);
			} else if (requestKeys !== undefined) {
				for (const requestKey of requestKeys) this._take(requestKey, groups);
			} else if (this._fallbackRequests !== undefined) {
				for (const requestKey of this._fallbackRequests) {
					this._take(requestKey, groups);
				}
				if (unknownIds === undefined) unknownIds = new Set();
				unknownIds.add(id);
			}
		}
		return unknownIds;
	}

	/**
	 * Activates a deferred group and appends it to `groups`.
	 * @param {string} requestKey request key
	 * @param {DependencyGroup[]} groups activated groups
	 */
	_take(requestKey, groups) {
		const group = this._requestToDepGroup.get(requestKey);
		if (group === undefined) return;
		this._requestToDepGroup.delete(requestKey);
		for (const dependency of group.dependencies) {
			dependency.setLazy(false);
		}
		groups.push(group);
	}

	/**
	 * Releases the name lookups once nothing needs forwarding.
	 */
	_release() {
		this._forwardIdToRequest = undefined;
		this._fallbackRequests = undefined;
		this._fallbackTargetModules = undefined;
	}
}

/**
 * Owns the lazy barrel state of side-effect-free modules for a `Compilation`.
 */
class LazyBarrelController {
	/**
	 * @param {Compilation} compilation the owning compilation
	 */
	constructor(compilation) {
		/** @type {Compilation} */
		this._compilation = compilation;
		/** @type {WeakMap<Module, LazyBarrelState>} */
		this._modules = new WeakMap();
	}

	/**
	 * Releases all state; its last reader is `FlagDependencyExportsPlugin` during `finishModules`.
	 */
	clear() {
		this._modules = new WeakMap();
	}

	/**
	 * Returns the requests `module` still defers, for `FlagDependencyExportsPlugin`'s cache key.
	 * @param {Module} module the module
	 * @returns {Iterable<string> | undefined} still-deferred requests, if any
	 */
	getLazyRequests(module) {
		if (!isSideEffectFree(module)) return;
		const state = this._modules.get(module);
		if (state === undefined) return;
		const info = state.lazyBarrelInfo;
		if (info === undefined || info.isEmpty()) return;
		return info.getLazyRequests();
	}

	/**
	 * Defers the re-export targets of a side-effect-free module, replaying names requested earlier.
	 * @param {Module} module the module whose dependencies are processed
	 * @returns {boolean} true, when some dependencies were deferred
	 */
	classify(module) {
		if (!isSideEffectFree(module)) return false;
		const modules = this._modules;
		const state = modules.get(module);
		const info = this._createInfo(
			module.dependencies,
			state === undefined ? undefined : state.forwardedIds
		);
		if (info === undefined) {
			if (state !== undefined) modules.delete(module);
			return false;
		}
		if (state === undefined) {
			modules.set(module, { forwardedIds: new Set(), lazyBarrelInfo: info });
			return true;
		}
		info.request(state.forwardedIds);
		state.lazyBarrelInfo = info;
		return !info.isEmpty();
	}

	/**
	 * Requests the export names `dependencies` need from a lazy barrel.
	 * @param {Module} module the resolved module
	 * @param {Dependency[]} dependencies the dependencies that resolved to the module
	 * @returns {UnlazyDependencyInfo[] | undefined} deferred groups to process now, if any
	 */
	request(module, dependencies) {
		if (!isSideEffectFree(module)) return;
		return this._requestWithIds(
			module,
			this._getRequestedIds(module, dependencies),
			undefined
		);
	}

	/**
	 * Queues the deferred groups a single dependency requests from a lazy barrel.
	 * @param {Module} module the resolved module of the dependency
	 * @param {Dependency} dependency the requesting dependency
	 * @param {{ factory: ModuleFactory, dependencies: Dependency[], context: string | undefined, originModule: Module | null }[]} sortedDependencies item list to append to
	 */
	unlazyForDependency(module, dependency, sortedDependencies) {
		const unlazyItems = this.request(module, [dependency]);
		if (unlazyItems === undefined) return;
		for (const item of unlazyItems) sortedDependencies.push(item);
	}

	/**
	 * Collects the deferrable dependencies of a side-effect-free module.
	 * @param {Dependency[]} dependencies dependencies of the module
	 * @param {Set<string> | true | undefined} forwardedIds names requested before classification
	 * @returns {LazyBarrelInfo | undefined} deferral info, undefined when nothing is deferrable
	 */
	_createInfo(dependencies, forwardedIds) {
		/** @type {LazyBarrelInfo | undefined} */
		let info;
		/** @type {Set<string>} */
		const localIds = new Set();
		/** @type {Set<string>} */
		const reexportRequests = new Set();
		let hasFallbackStarReexport = false;

		// re-exports
		for (const dep of dependencies) {
			const until = getLazyUntil(dep);
			if (until === Dependency.LAZY_UNTIL_LOCAL) {
				const name = dep.getLazyName();
				if (typeof name === "string") localIds.add(name);
				continue;
			}
			if (until === undefined || until === null) continue;
			const factory = this._getDepFactory(dep);
			if (factory === undefined) continue;
			const requestKey = getRequestKey(dep);
			if (info === undefined) info = new LazyBarrelInfo();
			if (dep.isLazy()) info.addLazy(requestKey, dep, factory);
			if (until === Dependency.LAZY_UNTIL_ID) {
				info.addForwardId(
					/** @type {string} */ (dep.getLazyName()),
					requestKey
				);
				reexportRequests.add(requestKey);
			} else if (until === Dependency.LAZY_UNTIL_FALLBACK) {
				info.addFallback(requestKey);
				reexportRequests.add(requestKey);
				hasFallbackStarReexport = true;
			}
		}

		// import declarations
		/** @type {Set<string> | undefined} */
		let importRequests;
		if (canDeferImports(forwardedIds, localIds)) {
			const importEntryRequests = getImportEntryRequests(dependencies);
			for (const dep of dependencies) {
				const until = getLazyUntil(dep);
				// Only for ESM specifiers (null) and ESM side-effect ("@")
				if (
					(until !== null && until !== Dependency.LAZY_UNTIL_REQUEST) ||
					dep.category !== Dependency.ESM_CATEGORY
				) {
					continue;
				}
				const factory = this._getDepFactory(dep);
				if (factory === undefined || dep.isLazy() === false) continue;
				const requestKey = getRequestKey(dep);
				// a re-export's own side-effect import stays in the re-export group
				if (
					reexportRequests.has(requestKey) &&
					!importEntryRequests.has(requestKey)
				) {
					continue;
				}
				if (info === undefined) info = new LazyBarrelInfo();
				dep.setLazy(true);
				info.addLazy(requestKey, dep, factory);
				if (importRequests === undefined) importRequests = new Set();
				importRequests.add(requestKey);
			}
		}

		if (info === undefined) return;

		// local exports: known names, so they skip the star fallback but active the deferred imports
		if (hasFallbackStarReexport || importRequests !== undefined) {
			const requests =
				importRequests === undefined ? EMPTY_REQUESTS : importRequests;
			for (const id of localIds) info.addForwardId(id, requests);
		}
		return info;
	}

	/**
	 * Returns the factory of a dependency the barrel can defer.
	 * @param {Dependency} dependency the dependency
	 * @returns {ModuleFactory | undefined} factory, undefined when not deferrable
	 */
	_getDepFactory(dependency) {
		if (
			!("setLazy" in dependency) ||
			dependency.getResourceIdentifier() === null
		) {
			return;
		}
		return this._compilation.dependencyFactories.get(
			/** @type {DependencyConstructor} */ (dependency.constructor)
		);
	}

	/**
	 * Collects the export names `dependencies` request from `module`, registering star re-export targets.
	 * @param {Module} module the module the dependencies resolved to
	 * @param {Dependency[]} dependencies the dependencies that resolved to the module
	 * @returns {Set<string> | true} requested export names, true for all
	 */
	_getRequestedIds(module, dependencies) {
		/** @type {Set<string>} */
		const ids = new Set();
		for (const dependency of dependencies) {
			// TODO in the next major release: remove the guard, custom dependencies must extend Dependency
			if (!("getForwardId" in dependency)) continue;

			// star re-export: take the barrel's names
			if (getLazyUntil(dependency) === Dependency.LAZY_UNTIL_FALLBACK) {
				const parent =
					this._compilation.moduleGraph.getParentModule(dependency);
				const parentState =
					parent === undefined ? undefined : this._modules.get(parent);
				if (parentState !== undefined) {
					if (parentState.lazyBarrelInfo !== undefined) {
						parentState.lazyBarrelInfo.addFallbackTarget(module);
					}
					if (parentState.forwardedIds === true) return true;
					for (const id of parentState.forwardedIds) ids.add(id);
					continue;
				}
			}
			const id = dependency.getForwardId();
			if (id === true) return true;
			if (id !== null) ids.add(id);
		}
		return ids;
	}

	/**
	 * Requests names from a module and collects the groups they activate, following resolved star re-exports.
	 * @param {Module} module the resolved module
	 * @param {Set<string> | true} ids requested export names, true for all
	 * @param {UnlazyDependencyInfo[] | undefined} items items collected so far
	 * @returns {UnlazyDependencyInfo[] | undefined} items to process, if any
	 */
	_requestWithIds(module, ids, items) {
		if (!isSideEffectFree(module)) return items;

		if (ids !== true && ids.size === 0) return items;
		const state = this._modules.get(module);
		if (state === undefined) {
			// replayed by classify; copied since star re-exports pass the barrel's own set
			this._modules.set(module, {
				forwardedIds: ids === true ? true : new Set(ids),
				lazyBarrelInfo: undefined
			});
			return items;
		}
		const newIds = mergeForwardedIds(state, ids);
		const info = state.lazyBarrelInfo;
		if (newIds === undefined || info === undefined) return items;
		const { groups, fallbackIds, fallbackTargets } = info.request(newIds);
		for (const group of groups) {
			if (items === undefined) items = [];
			items.push({
				factory: group.factory,
				dependencies: group.dependencies,
				context: group.context,
				originModule: module
			});
		}
		if (fallbackTargets !== undefined) {
			for (const target of fallbackTargets) {
				items = this._requestWithIds(
					target,
					/** @type {Set<string> | true} */ (fallbackIds),
					items
				);
			}
		}
		return items;
	}
}

module.exports = LazyBarrelController;
