"use strict";

const processAsyncTree = require("../lib/util/processAsyncTree");

describe("processAsyncTree", () => {
	it("should invoke the callback immediately for no items", (done) => {
		processAsyncTree(
			[],
			2,
			() => {},
			(err) => {
				expect(err).toBeUndefined();
				done();
			}
		);
	});

	it("should process an expanding tree of pushed items", (done) => {
		/** @type {number[]} */
		const seen = [];
		processAsyncTree(
			[1],
			2,
			(item, push, callback) => {
				seen.push(item);
				if (item < 4) {
					push(item + 1);
					push(item + 10);
				}
				process.nextTick(callback);
			},
			(err) => {
				expect(err).toBeUndefined();
				expect([...seen].sort((a, b) => a - b)).toEqual([
					1, 2, 3, 4, 11, 12, 13
				]);
				done();
			}
		);
	});

	it("should propagate the first processor error and stop", (done) => {
		let processed = 0;
		processAsyncTree(
			[1, 2, 3],
			1,
			(item, push, callback) => {
				processed++;
				if (item === 3) {
					callback(new Error("boom"));
					return;
				}
				process.nextTick(callback);
			},
			(err) => {
				expect(/** @type {Error} */ (err).message).toBe("boom");
				// with concurrency 1 the queue is drained from the end, so `3`
				// is hit first and no further items run
				expect(processed).toBe(1);
				done();
			}
		);
	});

	it("should schedule processing for items pushed asynchronously", (done) => {
		/** @type {number[]} */
		const seen = [];
		processAsyncTree(
			[1],
			2,
			(item, push, callback) => {
				seen.push(item);
				// defer both the push and completion so the queue drains first,
				// forcing `push` to re-schedule processing
				process.nextTick(() => {
					if (item === 1) push(2);
					callback();
				});
			},
			(err) => {
				expect(err).toBeUndefined();
				expect(seen.sort((a, b) => a - b)).toEqual([1, 2]);
				done();
			}
		);
	});

	it("should respect the concurrency limit", (done) => {
		let running = 0;
		let maxRunning = 0;
		const items = [1, 2, 3, 4, 5, 6];
		processAsyncTree(
			items,
			2,
			(item, push, callback) => {
				running++;
				maxRunning = Math.max(maxRunning, running);
				process.nextTick(() => {
					running--;
					callback();
				});
			},
			(err) => {
				expect(err).toBeUndefined();
				expect(maxRunning).toBeLessThanOrEqual(2);
				done();
			}
		);
	});
});
