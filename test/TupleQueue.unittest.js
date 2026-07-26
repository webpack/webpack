"use strict";

const TupleQueue = require("../lib/util/TupleQueue");

describe("TupleQueue", () => {
	it("should seed from an iterable and deduplicate tuples", () => {
		const queue = new TupleQueue([
			["a", 1],
			["a", 1],
			["b", 2]
		]);
		expect(queue).toHaveLength(2);
	});

	it("should dequeue distinct tuples until empty", () => {
		const queue = new TupleQueue([
			["a", 1],
			["b", 2]
		]);
		expect(queue.dequeue()).toEqual(["a", 1]);
		expect(queue.dequeue()).toEqual(["b", 2]);
		expect(queue.dequeue()).toBeUndefined();
	});

	it("should enqueue only new tuples", () => {
		const queue = new TupleQueue();
		queue.enqueue("x", 1);
		queue.enqueue("x", 1);
		expect(queue).toHaveLength(1);
		expect(queue.dequeue()).toEqual(["x", 1]);
	});

	it("should pick up tuples enqueued after the iterator was exhausted", () => {
		const queue = new TupleQueue([["a", 1]]);
		expect(queue.dequeue()).toEqual(["a", 1]);
		queue.enqueue("b", 2);
		expect(queue.dequeue()).toEqual(["b", 2]);
	});
});
