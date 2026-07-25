"use strict";

const Semaphore = require("../lib/util/Semaphore");

describe("Semaphore", () => {
	it("should run a callback immediately when a permit is available", () => {
		const semaphore = new Semaphore(1);
		const run = jest.fn();
		semaphore.acquire(run);
		expect(run).toHaveBeenCalledTimes(1);
		expect(semaphore.available).toBe(0);
	});

	it("should queue callbacks once permits are exhausted", () => {
		const semaphore = new Semaphore(1);
		const first = jest.fn();
		const second = jest.fn();
		semaphore.acquire(first);
		semaphore.acquire(second);
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).not.toHaveBeenCalled();
		expect(semaphore.waiters).toHaveLength(1);
	});

	it("should release a queued callback on the next tick", (done) => {
		const semaphore = new Semaphore(1);
		const first = jest.fn();
		const second = jest.fn();
		semaphore.acquire(first);
		semaphore.acquire(second);
		semaphore.release();
		// the waiter is scheduled asynchronously via process.nextTick
		expect(second).not.toHaveBeenCalled();
		process.nextTick(() => {
			expect(second).toHaveBeenCalledTimes(1);
			done();
		});
	});

	it("should stay consistent when more permits are released than waiters", (done) => {
		const semaphore = new Semaphore(0);
		const run = jest.fn();
		semaphore.acquire(run);
		// two releases schedule two drains, but there is only one waiter
		semaphore.release();
		semaphore.release();
		setTimeout(() => {
			expect(run).toHaveBeenCalledTimes(1);
			expect(semaphore.available).toBe(1);
			expect(semaphore.waiters).toHaveLength(0);
			done();
		}, 50);
	});

	it("should just return the permit when nothing is waiting", () => {
		const semaphore = new Semaphore(1);
		semaphore.acquire(() => {});
		semaphore.release();
		expect(semaphore.available).toBe(1);
		expect(semaphore.waiters).toHaveLength(0);
	});

	it("should drain queued waiters last-in-first-out as permits are released", (done) => {
		const semaphore = new Semaphore(1);
		/** @type {number[]} */
		const order = [];
		semaphore.acquire(() => order.push(1));
		semaphore.acquire(() => {
			order.push(2);
			semaphore.release();
		});
		semaphore.acquire(() => {
			order.push(3);
			semaphore.release();
		});
		semaphore.release();
		// waiters are popped from the end, so the later acquire runs first
		setTimeout(() => {
			expect(order).toEqual([1, 3, 2]);
			done();
		}, 50);
	});
});
