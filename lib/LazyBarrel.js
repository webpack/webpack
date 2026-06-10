/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./ModuleFactory")} ModuleFactory */

/** @typedef {Dependency & { _lazyMake: boolean }} LazyMakeDependency */

/**
 * Defines the deferred request group type used by this module.
 * @typedef {object} DependencyGroup
 * @property {ModuleFactory} factory factory for the request
 * @property {Dependency[]} dependencies deferred dependencies of the request
 * @property {string | undefined} context request context
 */

/**
 * Tracks the deferred (not yet factorized/built) dependencies of a
 * side-effect-free barrel module and which export names resolve to them.
 */
class LazyBarrel {
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
		/** @type {LazyMakeDependency} */ (dependency)._lazyMake = true;
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
				/** @type {LazyMakeDependency} */ (dependency)._lazyMake = false;
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

	/**
	 * Collects the export names a dependency group requests from its target.
	 * @param {Dependency[]} dependencies dependency group resolving to one module
	 * @returns {Set<string> | true} requested export names, true for all
	 */
	static getForwardedIds(dependencies) {
		/** @type {Set<string>} */
		const ids = new Set();
		for (const dependency of dependencies) {
			const id = dependency.getForwardId();
			if (id === true) return true;
			if (id !== null) ids.add(id);
		}
		return ids;
	}
}

module.exports = LazyBarrel;
