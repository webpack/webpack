/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SortableSet = require("./util/SortableSet");

/** @typedef {import("./Chunk")} Chunk */

/**
 * @template T
 * @param {SortableSet<T>} set the set
 * @returns {T[]} set as array
 */
const getArray = set => {
	return Array.from(set);
};

let debugId = 1;

class ChunkCombination {
	constructor() {
		this.debugId = debugId++;
		this.size = 0;
		/**
		 * (do not modify)
		 * @type {SortableSet<Chunk>}
		 */
		this._chunks = new SortableSet();
		/** @type {ChunkCombination} */
		this._parent = undefined;
		this._lastChunk = undefined;
		/** @type {WeakMap<Chunk, ChunkCombination>} */
		this._addMap = new WeakMap();
		/** @type {WeakMap<Chunk, ChunkCombination>} */
		this._removeCache = new WeakMap();
	}

	/**
	 * @returns {Iterable<Chunk>} iterable of chunks
	 */
	get chunksIterable() {
		return this._chunks;
	}

	/**
	 * @param {Chunk} chunk chunk to add
	 * @returns {ChunkCombination} new chunk combination
	 */
	with(chunk) {
		if (this._chunks.has(chunk)) return this;
		let next = this._addMap.get(chunk);
		if (next !== undefined) return next;
		// must insert chunks in order to maintain order-independent identity of ChunkCombination
		if (!this._parent || this._lastChunk.debugId < chunk.debugId) {
			next = new ChunkCombination();
			for (const chunk of this._chunks) {
				next._chunks.add(chunk);
			}
			next._chunks.add(chunk);
			next._removeCache.set(chunk, this);
			next.size = this.size + 1;
			next._parent = this;
			next._lastChunk = chunk;
		} else {
			next = this._parent.with(chunk).with(this._lastChunk);
		}
		this._addMap.set(chunk, next);
		return next;
	}

	/**
	 * @param {Chunk} chunk chunk to remove
	 * @returns {ChunkCombination} new chunk combination
	 */
	without(chunk) {
		if (!this._chunks.has(chunk)) return this;
		let next = this._removeCache.get(chunk);
		if (next !== undefined) return next;
		const stack = [this._lastChunk];
		let current = this._parent;
		while (current._lastChunk !== chunk) {
			stack.push(current._lastChunk);
			current = current._parent;
		}
		next = current._parent;
		while (stack.length) next = next.with(stack.pop());
		this._removeCache.set(chunk, next);
		return next;
	}

	withAll(other) {
		if (other.size === 0) return this;
		if (this.size === 0) return other;
		const stack = [];
		/** @type {ChunkCombination} */
		let current = this;
		for (;;) {
			if (current._lastChunk.debugId < other._lastChunk.debugId) {
				stack.push(other._lastChunk);
				other = other._parent;
				if (other.size === 0) {
					while (stack.length) current = current.with(stack.pop());
					return current;
				}
			} else {
				stack.push(current._lastChunk);
				current = current._parent;
				if (current.size === 0) {
					while (stack.length) other = other.with(stack.pop());
					return other;
				}
			}
		}
	}

	hasSharedChunks(other) {
		if (this.size > other.size) {
			const chunks = this._chunks;
			for (const chunk of other._chunks) {
				if (chunks.has(chunk)) return true;
			}
		} else {
			const chunks = other._chunks;
			for (const chunk of this._chunks) {
				if (chunks.has(chunk)) return true;
			}
		}
		return false;
	}

	/**
	 * @param {ChunkCombination} other other combination
	 * @returns {boolean} true, when other is a subset of this combination
	 */
	isSubset(other) {
		// TODO: This could be more efficient when using the debugId order of the combinations
		/** @type {ChunkCombination} */
		let current = this;
		let otherSize = other.size;
		let currentSize = current.size;
		if (otherSize === 0) return true;
		for (;;) {
			if (currentSize === 0) return false;
			if (otherSize === 1) {
				if (currentSize === 1) {
					return current._lastChunk === other._lastChunk;
				} else {
					return current._chunks.has(other._lastChunk);
				}
			}
			if (otherSize * 8 < currentSize) {
				// go for the Set access when current >> other
				const chunks = current._chunks;
				for (const item of other._chunks) {
					if (!chunks.has(item)) return false;
				}
				return true;
			}
			const otherId = other._lastChunk.debugId;
			// skip over nodes in current that have higher ids
			while (otherId < current._lastChunk.debugId) {
				current = current._parent;
				currentSize--;
				if (currentSize === 0) return false;
			}
			if (otherId > current._lastChunk.debugId) {
				return false;
			}
			other = other._parent;
			otherSize--;
			if (otherSize === 0) return true;
			current = current._parent;
			currentSize--;
		}
	}

	getChunks() {
		return this._chunks.getFromUnorderedCache(getArray);
	}
}

ChunkCombination.empty = new ChunkCombination();

module.exports = ChunkCombination;
