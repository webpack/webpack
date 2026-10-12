/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const TupleSet = require("../util/TupleSet");

/**
 * FIFO queue for tuples that preserves uniqueness by delegating membership
 * tracking to `TupleSet`.
 * @template {EXPECTED_ANY[]} K
 * @template V
 */
class TupleQueue {
	/**
	 * Seeds the queue with an optional iterable of tuples to visit.
	 * @param {Iterable<[...K, V]>=} items The initial elements.
	 */
	constructor(items) {
		/**
		 * @private
		 * @type {TupleSet<K, V>}
		 */
		this._set = new TupleSet(items);
		/**
		 * @private
		 * @type {Iterator<[...K, V]>}
		 */
		this._iterator = this._set[Symbol.iterator]();
	}

	/**
	 * Returns the number of distinct tuples currently queued.
	 * @returns {number} The number of elements in this queue.
	 */
	get length() {
		return this._set.size;
	}

	/**
	 * Enqueues a tuple if it is not already present in the underlying set.
	 * @param {[...K, V]} item The element to add.
	 * @returns {void}
	 */
	enqueue(...item) {
		this._set.add(...item);
	}

	/**
	 * Removes and returns the next queued tuple, rebuilding the iterator when
	 * the underlying tuple set has changed since the last full pass.
	 * @returns {[...K, V] | undefined} The head of the queue of `undefined` if this queue is empty.
	 */
	dequeue() {
		const result = this._iterator.next();
		if (result.done) {
			if (this._set.size > 0) {
				this._iterator = this._set[Symbol.iterator]();
				const value =
					/** @type {[...K, V]} */
					(this._iterator.next().value);
				this._set.delete(...value);
				return value;
			}
			return;
		}
		this._set.delete(.../** @type {[...K, V]} */ (result.value));
		return result.value;
	}
}

module.exports = TupleQueue;
