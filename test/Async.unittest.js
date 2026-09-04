"use strict";

const { each, eachLimit, map, parallel } = require("../lib/util/async");

/**
 * Builds an iterator that completes on a later tick, recording the order in
 * which items were started.
 * @param {number[]} started items the iterator was called with
 * @returns {(item: number, callback: (err?: Error | null) => void) => void} iterator
 */
const asyncNoop = (started) => (item, callback) => {
	started.push(item);
	setImmediate(callback);
};

describe("each", () => {
	it("visits every item of an array and completes once", (done) => {
		/** @type {number[]} */
		const seen = [];
		let calls = 0;
		each([1, 2, 3], asyncNoop(seen), (err) => {
			calls++;
			expect(err).toBeNull();
			expect(seen).toEqual([1, 2, 3]);
			setImmediate(() => {
				expect(calls).toBe(1);
				done();
			});
		});
	});

	it("visits every item of an iterable", (done) => {
		/** @type {string[]} */
		const seen = [];
		each(
			new Set(["a", "b"]),
			(item, callback) => {
				seen.push(item);
				setImmediate(callback);
			},
			(err) => {
				expect(err).toBeNull();
				expect(seen).toEqual(["a", "b"]);
				done();
			}
		);
	});

	it("completes an empty array and an empty iterable", () => {
		/** @type {(Error | null | undefined)[]} */
		const calls = [];
		each(
			[],
			() => {
				throw new Error("should not be called");
			},
			(err) => calls.push(err)
		);
		each(
			new Set(),
			() => {
				throw new Error("should not be called");
			},
			(err) => calls.push(err)
		);
		expect(calls).toEqual([null, null]);
	});

	it("reports the first error but still starts every array item", (done) => {
		/** @type {number[]} */
		const started = [];
		/** @type {(Error | null | undefined)[]} */
		const errors = [];
		each(
			[1, 2, 3],
			(item, callback) => {
				started.push(item);
				callback(item === 1 ? new Error("nope") : null);
			},
			(err) => errors.push(err)
		);
		expect(errors).toHaveLength(1);
		expect(/** @type {Error} */ (errors[0]).message).toBe("nope");
		expect(started).toEqual([1, 2, 3]);
		done();
	});

	it("reports the first error of an iterable", (done) => {
		each(
			new Set([1, 2]),
			(item, callback) => {
				setImmediate(() => callback(new Error(`fail ${item}`)));
			},
			(err) => {
				expect(err.message).toBe("fail 1");
				done();
			}
		);
	});

	it("does not grow the stack for a synchronous iterator", (done) => {
		const items = Array.from({ length: 200000 }, (_, i) => i);
		let count = 0;
		each(
			items,
			(item, callback) => {
				count++;
				callback();
			},
			(err) => {
				expect(err).toBeNull();
				expect(count).toBe(items.length);
				done();
			}
		);
	});
});

describe("eachLimit", () => {
	it("never exceeds the limit and visits every item", (done) => {
		const items = Array.from({ length: 20 }, (_, i) => i);
		let running = 0;
		let peak = 0;
		/** @type {number[]} */
		const seen = [];
		eachLimit(
			items,
			3,
			(item, callback) => {
				running++;
				peak = Math.max(peak, running);
				seen.push(item);
				setImmediate(() => {
					running--;
					callback();
				});
			},
			(err) => {
				expect(err).toBeNull();
				expect(peak).toBe(3);
				expect(seen).toEqual(items);
				done();
			}
		);
	});

	it("accepts a limit larger than the collection", (done) => {
		eachLimit(
			[1, 2],
			10,
			(item, callback) => setImmediate(callback),
			(err) => {
				expect(err).toBeNull();
				done();
			}
		);
	});

	it("iterates a Map as entries", (done) => {
		/** @type {string[]} */
		const seen = [];
		eachLimit(
			new Map([
				["a", 1],
				["b", 2]
			]),
			1,
			([key, value], callback) => {
				seen.push(`${key}${value}`);
				setImmediate(callback);
			},
			(err) => {
				expect(err).toBeNull();
				expect(seen).toEqual(["a1", "b2"]);
				done();
			}
		);
	});

	it("completes an empty array and an empty iterable", () => {
		/** @type {(Error | null | undefined)[]} */
		const calls = [];
		eachLimit(
			[],
			2,
			() => {
				throw new Error("should not be called");
			},
			(err) => calls.push(err)
		);
		eachLimit(
			new Set(),
			2,
			() => {
				throw new Error("should not be called");
			},
			(err) => calls.push(err)
		);
		expect(calls).toEqual([null, null]);
	});

	it("stops handing out work after an error", (done) => {
		/** @type {number[]} */
		const started = [];
		eachLimit(
			[1, 2, 3, 4],
			1,
			(item, callback) => {
				started.push(item);
				setImmediate(() => callback(item === 2 ? new Error("stop") : null));
			},
			(err) => {
				expect(err.message).toBe("stop");
				expect(started).toEqual([1, 2]);
				done();
			}
		);
	});

	it("reports an error raised while iterating an iterable", (done) => {
		eachLimit(
			new Set([1, 2]),
			2,
			(item, callback) => {
				callback(item === 2 ? new Error("second") : null);
			},
			(err) => {
				expect(err.message).toBe("second");
				done();
			}
		);
	});

	it("ignores an item that completes after the error was reported", (done) => {
		let calls = 0;
		eachLimit(
			[1, 2],
			2,
			(item, callback) => {
				if (item === 2) return callback(new Error("early"));
				setImmediate(callback);
			},
			(err) => {
				calls++;
				expect(err.message).toBe("early");
			}
		);
		setImmediate(() => {
			expect(calls).toBe(1);
			done();
		});
	});

	it("completes immediately when the limit is below one", () => {
		/** @type {(Error | null | undefined)[]} */
		const calls = [];
		eachLimit(
			[1, 2],
			0,
			() => {
				throw new Error("should not be called");
			},
			(err) => calls.push(err)
		);
		expect(calls).toEqual([null]);
	});

	it("does not grow the stack for a synchronous iterator", (done) => {
		const items = Array.from({ length: 200000 }, (_, i) => i);
		let count = 0;
		eachLimit(
			items,
			4,
			(item, callback) => {
				count++;
				callback();
			},
			(err) => {
				expect(err).toBeNull();
				expect(count).toBe(items.length);
				done();
			}
		);
	});

	it("does not grow the stack for a synchronous iterable iterator", (done) => {
		const items = new Set(Array.from({ length: 200000 }, (_, i) => i));
		let count = 0;
		eachLimit(
			items,
			4,
			(item, callback) => {
				count++;
				callback();
			},
			(err) => {
				expect(err).toBeNull();
				expect(count).toBe(items.size);
				done();
			}
		);
	});
});

describe("map", () => {
	it("keeps results in collection order, not completion order", (done) => {
		map(
			[30, 10, 20],
			(item, callback) => {
				setTimeout(() => callback(null, item * 2), item);
			},
			(err, results) => {
				expect(err).toBeNull();
				expect(results).toEqual([60, 20, 40]);
				done();
			}
		);
	});

	it("keeps results in collection order for an iterable", (done) => {
		map(
			new Set([3, 1, 2]),
			(item, callback) => {
				setTimeout(() => callback(null, `#${item}`), item * 5);
			},
			(err, results) => {
				expect(err).toBeNull();
				expect(results).toEqual(["#3", "#1", "#2"]);
				done();
			}
		);
	});

	it("completes an empty array and an empty iterable", () => {
		/** @type {[Error | null | undefined, unknown[] | undefined][]} */
		const calls = [];
		map(
			[],
			() => {
				throw new Error("should not be called");
			},
			(err, results) => calls.push([err, results])
		);
		map(
			new Set(),
			() => {
				throw new Error("should not be called");
			},
			(err, results) => calls.push([err, results])
		);
		expect(calls).toEqual([
			[null, []],
			[null, []]
		]);
	});

	it("reports the first error", (done) => {
		map(
			[1, 2],
			(item, callback) => {
				setImmediate(() =>
					callback(item === 1 ? new Error("bad") : null, item)
				);
			},
			(err) => {
				expect(err.message).toBe("bad");
				done();
			}
		);
	});

	it("reports an iterable error once, even mid-dispatch", () => {
		/** @type {(Error | null | undefined)[]} */
		const errors = [];
		map(
			new Set([1, 2]),
			(item, callback) =>
				callback(item === 1 ? new Error("first") : null, item),
			(err) => errors.push(err)
		);
		expect(errors).toHaveLength(1);
		expect(/** @type {Error} */ (errors[0]).message).toBe("first");
	});

	it("keeps a result that arrives after the error out of the results", (done) => {
		/** @type {(unknown[] | undefined)[]} */
		const calls = [];
		map(
			[1, 2],
			(item, callback) => {
				if (item === 1) return callback(new Error("bad"));
				setImmediate(() => callback(null, "late"));
			},
			(err, results) => {
				expect(err.message).toBe("bad");
				calls.push(results);
			}
		);
		setImmediate(() => {
			expect(calls).toHaveLength(1);
			expect(calls[0]).not.toContain("late");
			done();
		});
	});

	it("ignores an iterator that calls back twice", (done) => {
		let calls = 0;
		map(
			[1, 2],
			(item, callback) => {
				setImmediate(() => {
					callback(null, item);
					callback(null, item);
				});
			},
			(err, results) => {
				calls++;
				expect(err).toBeNull();
				expect(results).toEqual([1, 2]);
				setImmediate(() => {
					expect(calls).toBe(1);
					done();
				});
			}
		);
	});

	it("works with a synchronous iterator", (done) => {
		map(
			[1, 2, 3],
			(item, callback) => callback(null, item + 1),
			(err, results) => {
				expect(err).toBeNull();
				expect(results).toEqual([2, 3, 4]);
				done();
			}
		);
	});
});

describe("parallel", () => {
	it("collects the results in task order", (done) => {
		parallel(
			[
				(callback) => setTimeout(() => callback(null, "slow"), 20),
				(callback) => callback(null, "fast"),
				(callback) => callback()
			],
			(err, results) => {
				expect(err).toBeNull();
				expect(results).toEqual(["slow", "fast", undefined]);
				done();
			}
		);
	});

	it("completes without tasks", () => {
		/** @type {(unknown[] | undefined)[]} */
		const calls = [];
		parallel([], (err, results) => {
			expect(err).toBeNull();
			calls.push(results);
		});
		expect(calls).toEqual([[]]);
	});

	it("reports the first error", (done) => {
		parallel(
			[
				(callback) => setImmediate(() => callback(new Error("task failed"))),
				(callback) => setImmediate(() => callback(null, 1))
			],
			(err) => {
				expect(err.message).toBe("task failed");
				done();
			}
		);
	});
});
