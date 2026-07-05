"use strict";

const AsyncQueue = require("../lib/util/AsyncQueue");

/** @typedef {import("../lib/util/AsyncQueue").Processor<number, number>} NumberProcessor */

/**
 * @param {{ processor?: NumberProcessor }} options options
 * @returns {AsyncQueue<number, number, number>} queue
 */
const createQueue = ({ processor } = {}) =>
	new AsyncQueue({
		name: "test",
		parallelism: 1,
		processor:
			processor ||
			((item, callback) => {
				setImmediate(() => callback(null, item * 2));
			})
	});

describe("AsyncQueue", () => {
	it("should process items without any hooks tapped", (done) => {
		const queue = createQueue();
		queue.add(1, (err, result) => {
			expect(err).toBeFalsy();
			expect(result).toBe(2);
			done();
		});
	});

	it("should call beforeAdd, added, beforeStart, started and result hooks", (done) => {
		const queue = createQueue();
		/** @type {string[]} */
		const calls = [];
		queue.hooks.beforeAdd.tapAsync("Test", (item, callback) => {
			calls.push(`beforeAdd:${item}`);
			callback();
		});
		queue.hooks.added.tap("Test", (item) => calls.push(`added:${item}`));
		queue.hooks.beforeStart.tapAsync("Test", (item, callback) => {
			calls.push(`beforeStart:${item}`);
			callback();
		});
		queue.hooks.started.tap("Test", (item) => calls.push(`started:${item}`));
		queue.hooks.result.tap("Test", (item, err, result) =>
			calls.push(`result:${item}:${result}`)
		);
		queue.add(3, (err, result) => {
			expect(err).toBeFalsy();
			expect(result).toBe(6);
			expect(calls).toEqual([
				"beforeAdd:3",
				"added:3",
				"beforeStart:3",
				"started:3",
				"result:3:6"
			]);
			done();
		});
	});

	it("should forward beforeAdd hook errors to the callback", (done) => {
		const queue = createQueue();
		queue.hooks.beforeAdd.tapAsync("Test", (item, callback) => {
			callback(new Error("before add failed"));
		});
		queue.add(1, (err) => {
			expect(err).toBeInstanceOf(Error);
			expect(/** @type {Error} */ (err).message).toMatch("before add failed");
			done();
		});
	});

	it("should forward beforeStart hook errors to the callback", (done) => {
		const queue = createQueue();
		queue.hooks.beforeStart.tapAsync("Test", (item, callback) => {
			callback(new Error("before start failed"));
		});
		queue.add(1, (err) => {
			expect(err).toBeInstanceOf(Error);
			expect(/** @type {Error} */ (err).message).toMatch("before start failed");
			done();
		});
	});

	it("should deduplicate items with the same key", (done) => {
		let processed = 0;
		const queue = createQueue({
			processor: (item, callback) => {
				processed++;
				setImmediate(() => callback(null, item * 2));
			}
		});
		let remaining = 2;
		/**
		 * @param {Error | null | undefined} err error
		 * @param {number | null | undefined} result result
		 */
		const onDone = (err, result) => {
			expect(err).toBeFalsy();
			expect(result).toBe(10);
			if (--remaining === 0) {
				expect(processed).toBe(1);
				done();
			}
		};
		queue.add(5, onDone);
		queue.add(5, onDone);
	});

	it("should report errors thrown by the processor", (done) => {
		const queue = createQueue({
			processor: () => {
				throw new Error("processor failed");
			}
		});
		queue.add(1, (err) => {
			expect(err).toBeInstanceOf(Error);
			expect(/** @type {Error} */ (err).message).toMatch("processor failed");
			done();
		});
	});

	it("should wrap errors thrown by the result hook", (done) => {
		const queue = createQueue();
		queue.hooks.result.tap("Test", () => {
			throw new Error("result hook failed");
		});
		queue.add(1, (err) => {
			expect(err).toBeInstanceOf(Error);
			expect(/** @type {Error} */ (err).message).toMatch("result hook failed");
			done();
		});
	});

	it("should serve finished items and collect multiple waiters", (done) => {
		const queue = createQueue();
		queue.add(7, (err, result) => {
			expect(result).toBe(14);
			// entry is in DONE state now — served without re-processing
			queue.add(7, (err2, result2) => {
				expect(result2).toBe(14);
				done();
			});
		});
		// both are queued behind the processing entry -> callbacks list
		queue.add(7, (err, result) => expect(result).toBe(14));
		queue.add(7, (err, result) => expect(result).toBe(14));
	});

	it("should fail items added while a beforeAdd hook is in flight after stop", (done) => {
		const queue = createQueue();
		queue.hooks.beforeAdd.tapAsync("Test", (item, callback) => {
			setImmediate(() => callback());
		});
		queue.add(1, (err) => {
			expect(err).toBeInstanceOf(Error);
			expect(/** @type {Error} */ (err).message).toMatch("Queue was stopped");
			done();
		});
		// stop before the async beforeAdd hook completes
		queue.stop();
	});
});
