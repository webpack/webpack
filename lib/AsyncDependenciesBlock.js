/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const DependenciesBlock = require("./DependenciesBlock");

/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./util/createHash").Hash} Hash */
/** @typedef {TODO} GroupOptions */

class AsyncDependenciesBlock extends DependenciesBlock {
	/**
	 * @param {GroupOptions} groupOptions options for the group
	 * @param {Module} module the Module object
	 * @param {DependencyLocation=} loc the line of code
	 * @param {TODO=} request the request
	 */
	constructor(groupOptions, module, loc, request) {
		super();
		if (typeof groupOptions === "string") {
			groupOptions = { name: groupOptions };
		} else if (!groupOptions) {
			groupOptions = { name: undefined };
		}
		this.groupOptions = groupOptions;
		this.loc = loc;
		this.request = request;
		/** @type {DependenciesBlock} */
		this.parent = undefined;
		/** @type {[number, number]} */
		this.range = undefined;
	}

	/**
	 * @returns {string} The name of the chunk
	 */
	get chunkName() {
		return this.groupOptions.name;
	}

	/**
	 * @param {string} value The new chunk name
	 * @returns {void}
	 */
	set chunkName(value) {
		this.groupOptions.name = value;
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		hash.update(JSON.stringify(this.groupOptions));
		const chunkGroup = chunkGraph.getBlockChunkGroup(this);
		hash.update(chunkGroup ? chunkGroup.id : "");
		super.updateHash(hash, chunkGraph);
	}
}

Object.defineProperty(AsyncDependenciesBlock.prototype, "module", {
	get() {
		throw new Error(
			"module property was removed from AsyncDependenciesBlock (it's not needed)"
		);
	},
	set() {
		throw new Error(
			"module property was removed from AsyncDependenciesBlock (it's not needed)"
		);
	}
});

module.exports = AsyncDependenciesBlock;
