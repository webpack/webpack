"use strict";

const ArrayQueue = require("../lib/util/ArrayQueue");

describe("ArrayQueue", () => {
	it("should seed from an iterable and report length", () => {
		const queue = new ArrayQueue([1, 2, 3]);
		expect(queue).toHaveLength(3);
	});

	it("should dequeue in FIFO order and interleave with enqueue", () => {
		const queue = new ArrayQueue([1, 2, 3]);
		expect(queue.dequeue()).toBe(1);
		queue.enqueue(4);
		expect(queue.dequeue()).toBe(2);
		expect(queue.dequeue()).toBe(3);
		expect(queue.dequeue()).toBe(4);
		expect(queue.dequeue()).toBeUndefined();
	});

	it("should keep FIFO order past the reversed-buffer threshold", () => {
		const queue = new ArrayQueue();
		for (let i = 0; i < 20; i++) queue.enqueue(i);
		const out = [];
		for (let i = 0; i < 20; i++) out.push(queue.dequeue());
		expect(out).toEqual([...Array.from({ length: 20 }).keys()]);
	});

	it("should clear both buffers", () => {
		const queue = new ArrayQueue([1, 2]);
		queue.clear();
		expect(queue).toHaveLength(0);
		expect(queue.dequeue()).toBeUndefined();
	});

	it("should delete an item from the pending list", () => {
		const queue = new ArrayQueue([1, 2, 3, 4]);
		queue.delete(2);
		expect([...queue]).toEqual([1, 3, 4]);
	});

	it("should delete an item from the reversed buffer", () => {
		const queue = new ArrayQueue();
		for (let i = 0; i < 20; i++) queue.enqueue(i);
		// dequeue once to move the pending list into the reversed buffer
		queue.dequeue();
		queue.delete(19);
		expect(queue).toHaveLength(18);
	});

	it("should ignore a delete of an item that is not queued", () => {
		const queue = new ArrayQueue();
		for (let i = 0; i < 20; i++) queue.enqueue(i);
		// move items into the reversed buffer, then delete something absent
		queue.dequeue();
		queue.delete(999);
		expect(queue).toHaveLength(19);
	});

	it("should be iterable to drain remaining items", () => {
		const queue = new ArrayQueue([1, 2, 3]);
		expect([...queue]).toEqual([1, 2, 3]);
	});
});
