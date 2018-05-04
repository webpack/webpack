/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
"use strict";
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("crypto").Hash} Hash */
/** @typedef {(d: Dependency) => boolean} DependencyFilterFunction */

const DependenciesBlockVariable = require("./DependenciesBlockVariable");

class DependenciesBlock {
	constructor() {
		/** @type {Dependency[]} */
		this.dependencies = [];
		/** @type {DependenciesBlock[]} */
		this.blocks = [];
		/** @type {DependenciesBlockVariable[]} */
		this.variables = [];
		/** @type {DependenciesBlock=} */
		this.parent = undefined;
	}

	/**
	 * Adds a DependencyBlock to DependencyBlock relationship.
	 * This is used for when a Module has a AsyncDependencyBlock tie (for code-splitting)
	 *
	 * @param {DependenciesBlock} block block being added
	 * (typically a subclass like AsyncDependenciesBlock, or NormalModule)
	 */
	addBlock(block) {
		this.blocks.push(block);
		block.parent = this;
	}

	/**
	 * @param {string} name name of dependency
	 * @param {string} expression expression string for variable
	 * @param {Dependency[]} dependencies dependency instances tied to variable
	 * @memberof DependenciesBlock
	 */
	addVariable(name, expression, dependencies) {
		for (let v of this.variables) {
			if (v.name === name && v.expression === expression) {
				return;
			}
		}
		this.variables.push(
			new DependenciesBlockVariable(name, expression, dependencies)
		);
	}

	/**
	 * @param {Dependency} dependency dependency being tied to block.
	 * This is an "edge" pointing to another "node" on module graph.
	 */
	addDependency(dependency) {
		this.dependencies.push(dependency);
	}

	/**
	 * @param {Dependency} dependency dependency being removed.
	 */
	removeDependency(dependency) {
		const idx = this.dependencies.indexOf(dependency);
		if (idx >= 0) this.dependencies.splice(idx, 1);
	}

	/**
	 * @param {Hash} hash the hash instance controlling input changes and updates
	 */
	updateHash(hash) {
		for (const dep of this.dependencies) dep.updateHash(hash);
		for (const block of this.blocks) block.updateHash(hash);
		for (const variable of this.variables) variable.updateHash(hash);
	}

	disconnect() {
		for (const dep of this.dependencies) dep.disconnect();
		for (const block of this.blocks) block.disconnect();
		for (const variable of this.variables) variable.disconnect();
	}

	unseal() {
		for (const block of this.blocks) block.unseal();
	}

	/**
	 * Checks if current block has a dependencies based on provided
	 * filter predicate. Predicate is provided all dependencies from all blocks,
	 * and variables under current reference.
	 *
	 * @param {DependencyFilterFunction} filter
	 */
	hasDependencies(filter) {
		if (filter) {
			for (const dep of this.dependencies) {
				if (filter(dep)) return true;
			}
		} else {
			if (this.dependencies.length > 0) {
				return true;
			}
		}

		for (const block of this.blocks) {
			if (block.hasDependencies(filter)) return true;
		}
		for (const variable of this.variables) {
			if (variable.hasDependencies(filter)) return true;
		}
		return false;
	}

	sortItems() {
		for (const block of this.blocks) block.sortItems();
	}
}

module.exports = DependenciesBlock;
