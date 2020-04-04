/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("./AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./util/Hash")} Hash */

/** @typedef {(d: Dependency) => boolean} DependencyFilterFunction */

class DependenciesBlock {
	constructor() {
		/** @type {Dependency[]} */
		this.dependencies = [];
		/** @type {AsyncDependenciesBlock[]} */
		this.blocks = [];
	}

	/**
	 * Adds a DependencyBlock to DependencyBlock relationship.
	 * This is used for when a Module has a AsyncDependencyBlock tie (for code-splitting)
	 *
	 * @param {AsyncDependenciesBlock} block block being added
	 * @returns {void}
	 */
	addBlock(block) {
		this.blocks.push(block);
		block.parent = this;
	}

	/**
	 * @param {Dependency} dependency dependency being tied to block.
	 * This is an "edge" pointing to another "node" on module graph.
	 * @param {number=} i index to insert
	 * @returns {void}
	 */
	addDependency(dependency, i = this.dependencies.length) {
		this.dependencies.push(dependency);

		if (i < this.dependencies.length - 1) {
			let tmp1 = this.dependencies[i];
			this.dependencies[i] = dependency;
			let j = i;

			while (++j < this.dependencies.length) {
				let tmp2 = this.dependencies[j];
				this.dependencies[j] = tmp1;
				tmp1 = tmp2;
			}
		}
	}

	/**
	 * @param {Dependency} dependency dependency being removed
	 * @returns {void}
	 */
	removeDependency(dependency) {
		const idx = this.dependencies.indexOf(dependency);
		if (idx >= 0) {
			this.dependencies.splice(idx, 1);
		}
	}

	/**
	 * Removes all dependencies and blocks
	 * @returns {void}
	 */
	clearDependenciesAndBlocks() {
		this.dependencies.length = 0;
		this.blocks.length = 0;
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		for (const dep of this.dependencies) {
			dep.updateHash(hash, chunkGraph);
		}
		for (const block of this.blocks) {
			block.updateHash(hash, chunkGraph);
		}
	}

	serialize({ write }) {
		write(this.dependencies);
		write(this.blocks);
	}

	deserialize({ read }) {
		this.dependencies = read();
		this.blocks = read();
		for (const block of this.blocks) {
			block.parent = this;
		}
	}
}

makeSerializable(DependenciesBlock, "webpack/lib/DependenciesBlock");

module.exports = DependenciesBlock;
