"use strict";

module.exports = class Queue {
	constructor(items) {
		this.set = new Set(items);
		this.iterator = this.set[Symbol.iterator]();
	}

	get length() {
		return this.set.size;
	}

	enqueue(item) {
		this.set.add(item);
	}

	dequeue() {
		const result = this.iterator.next();
		if (result.done) return undefined;
		this.set.delete(result.value);
		return result.value;
	}
};
