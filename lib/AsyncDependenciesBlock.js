/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const DependenciesBlock = require("./DependenciesBlock");
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("./ChunkGroup").ChunkGroupOptions} ChunkGroupOptions */
/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("./Entrypoint").EntryOptions} EntryOptions */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("./serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("./util/Hash")} Hash */

/** @typedef {(ChunkGroupOptions & { entryOptions?: EntryOptions } & { circular?: boolean })} GroupOptions */

/**
 * Dependency block that represents a lazily loaded group of dependencies and
 * the chunk group options used when webpack turns that block into an async
 * chunk.
 */
class AsyncDependenciesBlock extends DependenciesBlock {
	/**
	 * Normalizes async chunk group options and records the source location and
	 * request that produced this async dependency block.
	 * @param {GroupOptions | string | null} groupOptions options for the group
	 * @param {(DependencyLocation | null)=} loc the line of code
	 * @param {(string | null)=} request the request
	 */
	constructor(groupOptions, loc, request) {
		super();
		if (typeof groupOptions === "string") {
			groupOptions = { name: groupOptions };
		} else if (!groupOptions) {
			groupOptions = { name: undefined };
		}
		if (typeof groupOptions.circular !== "boolean") {
			// default allow circular references
			groupOptions.circular = true;
		}
		/** @type {GroupOptions} */
		this.groupOptions = groupOptions;
		/** @type {DependencyLocation | null | undefined} */
		this.loc = loc;
		/** @type {string | null | undefined} */
		this.request = request;
		/** @type {undefined | string} */
		this._stringifiedGroupOptions = undefined;
	}

	/**
	 * Returns the configured async chunk name, if one was provided.
	 * @returns {ChunkGroupOptions["name"]} The name of the chunk
	 */
	get chunkName() {
		return this.groupOptions.name;
	}

	/**
	 * Updates the configured async chunk name and clears the cached serialized
	 * group options when it changes.
	 * @param {string | undefined} value The new chunk name
	 * @returns {void}
	 */
	set chunkName(value) {
		if (this.groupOptions.name !== value) {
			this.groupOptions.name = value;
			this._stringifiedGroupOptions = undefined;
		}
	}

	/**
	 * Returns whether this async block may legally participate in circular chunk
	 * group references.
	 * @returns {boolean} Whether circular references are allowed
	 */
	get circular() {
		return Boolean(this.groupOptions.circular);
	}

	/**
	 * Adds this block's chunk-group options and resolved chunk-group id to the
	 * hash contribution for the owning module.
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		const { chunkGraph } = context;
		if (this._stringifiedGroupOptions === undefined) {
			this._stringifiedGroupOptions = JSON.stringify(this.groupOptions);
		}
		const chunkGroup = chunkGraph.getBlockChunkGroup(this);
		hash.update(
			`${this._stringifiedGroupOptions}${chunkGroup ? chunkGroup.id : ""}`
		);
		super.updateHash(hash, context);
	}

	/**
	 * Serializes the async block's group options, location, and request before
	 * delegating to the base dependency block serializer.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.groupOptions);
		write(this.loc);
		write(this.request);
		super.serialize(context);
	}

	/**
	 * Restores the async block's serialized state and then deserializes the base
	 * dependency block data.
	 * @param {ObjectDeserializerContext} context context
	 */
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
