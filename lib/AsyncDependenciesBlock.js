/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const DependenciesBlock = require("./DependenciesBlock");
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./ChunkGroup").ChunkGroupOptions} ChunkGroupOptions */
/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./util/Hash")} Hash */

class AsyncDependenciesBlock extends DependenciesBlock {
	/**
	 * @param {ChunkGroupOptions} groupOptions options for the group
	 * @param {DependencyLocation=} loc the line of code
	 * @param {string=} request the request
	 */
	constructor(groupOptions, loc, request) {
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
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		const { chunkGraph } = context;
		hash.update(JSON.stringify(this.groupOptions));
		const chunkGroup = chunkGraph.getBlockChunkGroup(this);
		hash.update(chunkGroup ? chunkGroup.id : "");
		super.updateHash(hash, context);
	}

	/**
	 * @param {ChunkGroup} parentChunkGroup the parent chunk group
	 * @returns {boolean} true when this dependencies block should be loaded async
	 */
	isAsync(parentChunkGroup) {
		return true;
	}

	serialize(context) {
		const { write } = context;
		write(this.groupOptions);
		write(this.loc);
		write(this.request);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.groupOptions = read();
		this.loc = read();
		this.request = read();
		super.deserialize(context);
	}
}

makeSerializable(AsyncDependenciesBlock, "webpack/lib/AsyncDependenciesBlock");

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
