"use strict";

/**
 * @template T
 */
class PriorityQueue {
	/**
	 * @param {function(T):number} priorityFn The function to calculate the item's priority. Lower values will be pushed to the front of the queue
	 * @param {Iterable<T>=} items The initial elements.
	 */
	constructor(priorityFn, items) {
		/** @type {{priority: number, item: T}[]} */
		this.heap = [];
		/** @type {function(T):number}*/
		this.priorityFn = priorityFn;
		for (let item of items) {
			this.enqueue(item);
		}
	}

	/**
	 * Returns the number of elements in this queue.
	 * @returns {number} The number of elements in this queue.
	 */
	get length() {
		return this.heap.length;
	}

	/**
	 * Appends the specified element to this queue.
	 * @param {T} item The element to add.
	 * @returns {void}
	 */
	enqueue(item) {
		this.heap.push({ priority: this.priorityFn(item), item });
		this._siftUp();
	}

	/**
	 * Retrieves and removes the head of this queue.
	 * @returns {T | undefined} The head of the queue of `undefined` if this queue is empty.
	 */
	dequeue() {
		const lastIndex = this.length - 1;
		if (lastIndex > 0) {
			this._swap(0, lastIndex);
		}
		const poppedValue = this.heap.pop();
		this._siftDown();
		return poppedValue.item;
	}

	_getNodePriority(index) {
		return this.heap[index].priority;
	}

	_getParentIndex(index) {
		return ((index + 1) >>> 1) - 1;
	}

	_getLeftIndex(index) {
		return (index << 1) + 1;
	}

	_getRightIndex(index) {
		return (index + 1) << 1;
	}

	_swap(i, j) {
		[this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
	}

	_siftUp() {
		let node = this.length - 1;
		while (
			node > 0 &&
			this._getNodePriority(node) <
				this._getNodePriority(this._getParentIndex(node))
		) {
			this._swap(node, this._getParentIndex(node));
			node = this._getParentIndex(node);
		}
	}

	_siftDown() {
		let node = 0;
		while (
			(this._getLeftIndex(node) < this.length &&
				this._getNodePriority(this._getLeftIndex(node)) <
					this._getNodePriority(node)) ||
			(this._getRightIndex(node) < this.length &&
				this._getNodePriority(this._getRightIndex(node)) <
					this._getNodePriority(node))
		) {
			let minChild =
				this._getRightIndex(node) < this.length &&
				this._getNodePriority(this._getRightIndex(node)) <
					this._getNodePriority(this._getLeftIndex(node))
					? this._getRightIndex(node)
					: this._getLeftIndex(node);
			this._swap(node, minChild);
			node = minChild;
		}
	}
}

module.exports = PriorityQueue;
