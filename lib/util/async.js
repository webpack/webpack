/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/**
 * Wraps the shared completion callback for one item, so an iterator that
 * reports twice fails loudly instead of settling the run early.
 * @template E
 * @param {(err?: E | null) => void} done shared completion callback
 * @returns {(err?: E | null) => void} completion callback for a single item
 */
const once = (done) => {
	/** @type {((err?: E | null) => void) | undefined} */
	let pending = done;
	return (err) => {
		const fn = pending;
		if (fn === undefined) throw new Error("Callback was already called");
		pending = undefined;
		fn(err);
	};
};

/**
 * Runs `iterator` over every item with unlimited concurrency.
 * Every item is started from one flat loop, so a synchronous iterator never
 * grows the stack.
 * @template T
 * @template E
 * @param {Iterable<T>} collection items to iterate
 * @param {(item: T, callback: (err?: E | null) => void) => void} iterator called once per item
 * @param {(err?: E | null) => void} callback called when every item is done, or with the first error
 * @returns {void}
 */
const each = (collection, iterator, callback) => {
	let remaining = 1;
	let finished = false;

	/**
	 * @param {(E | null)=} err error
	 * @returns {void}
	 */
	const done = (err) => {
		if (finished) return;
		if (err) {
			finished = true;
			callback(err);
			return;
		}
		if (--remaining === 0) {
			finished = true;
			callback(null);
		}
	};

	if (Array.isArray(collection)) {
		const array = /** @type {T[]} */ (collection);
		const length = array.length;
		if (length === 0) return callback(null);
		remaining = length;
		// Dispatching continues past an error on purpose: callers rely on every
		// item being started, e.g. to close every watcher when one close fails.
		for (let i = 0; i < length; i++) iterator(array[i], once(done));
		return;
	}

	// `remaining` starts at 1 so that completion cannot fire while items of a
	// collection of unknown length are still being dispatched.
	for (const item of collection) {
		remaining++;
		iterator(item, once(done));
	}
	done(null);
};

/**
 * Runs `iterator` over every item, keeping at most `limit` of them in flight.
 * A synchronous iterator is drained by the dispatch loop instead of by
 * recursion, so the stack stays flat however long the collection is.
 * @template T
 * @template E
 * @param {Iterable<T>} collection items to iterate
 * @param {number} limit maximum number of items in flight
 * @param {(item: T, callback: (err?: E | null) => void) => void} iterator called once per item
 * @param {(err?: E | null) => void} callback called when every item is done, or with the first error
 * @returns {void}
 */
const eachLimit = (collection, limit, iterator, callback) => {
	const array = Array.isArray(collection)
		? /** @type {T[]} */ (collection)
		: undefined;
	const length = array === undefined ? 0 : array.length;
	const values =
		array === undefined ? collection[Symbol.iterator]() : undefined;
	let index = 0;
	let running = 0;
	let exhausted = false;
	let finished = false;
	let dispatching = false;

	const dispatch = () => {
		// A re-entrant call returns at once; the loop already running sees the
		// slot the completed item freed and takes the next one itself.
		if (dispatching) return;
		dispatching = true;
		while (running < limit && !exhausted) {
			// `finished` is set from `done`, which an iterator may call before it
			// returns, so it has to be re-read on every turn of this loop.
			if (finished) break;
			/** @type {T} */
			let item;
			if (array === undefined) {
				const next = /** @type {Iterator<T>} */ (values).next();
				if (next.done) {
					exhausted = true;
					break;
				}
				item = next.value;
			} else {
				if (index === length) {
					exhausted = true;
					break;
				}
				item = array[index++];
			}
			running++;
			iterator(item, once(done));
		}
		dispatching = false;
		if (exhausted && running === 0 && !finished) {
			finished = true;
			callback(null);
		}
	};

	/**
	 * @param {(E | null)=} err error
	 * @returns {void}
	 */
	const done = (err) => {
		if (finished) return;
		running--;
		if (err) {
			finished = true;
			callback(err);
			return;
		}
		dispatch();
	};

	if (limit < 1) return callback(null);

	dispatch();
};

/**
 * Runs `iterator` over every item with unlimited concurrency and collects the
 * results in the order of the collection, not the order of completion.
 * @template T
 * @template R
 * @template E
 * @param {Iterable<T>} collection items to iterate
 * @param {(item: T, callback: (err?: E | null, result?: R) => void) => void} iterator called once per item
 * @param {(err?: E | null, results?: R[]) => void} callback called with every result, or with the first error
 * @returns {void}
 */
const map = (collection, iterator, callback) => {
	const array = Array.isArray(collection)
		? /** @type {T[]} */ (collection)
		: undefined;
	// Pre-sized, because growing it or `Array.from` costs measurably more on
	// the small collections this is called with.
	/** @type {R[]} */
	// eslint-disable-next-line unicorn/no-new-array
	const results = array === undefined ? [] : new Array(array.length);
	let remaining = 1;
	let finished = false;

	/**
	 * @param {(E | null)=} err error
	 * @returns {void}
	 */
	const settle = (err) => {
		if (finished) return;
		if (err) {
			finished = true;
			callback(err, results);
			return;
		}
		if (--remaining === 0) {
			finished = true;
			callback(null, results);
		}
	};

	/**
	 * @param {number} index position the result of that item belongs at
	 * @returns {(err?: E | null, result?: R) => void} completion callback for that item
	 */
	const createCallback = (index) => {
		let position = index;
		return (err, result) => {
			const at = position;
			if (at === -1) throw new Error("Callback was already called");
			position = -1;
			// A result arriving after the run settled must not reach `results`,
			// which the callback already handed to the caller.
			if (finished) return;
			if (!err) results[at] = /** @type {R} */ (result);
			settle(err);
		};
	};

	if (array !== undefined) {
		const length = array.length;
		if (length === 0) return callback(null, results);
		remaining = length;
		for (let i = 0; i < length; i++) iterator(array[i], createCallback(i));
		return;
	}

	let index = 0;
	for (const item of collection) {
		remaining++;
		iterator(item, createCallback(index++));
	}
	results.length = index;
	settle(null);
};

/**
 * @template R
 * @template E
 * @param {(callback: (err?: E | null, result?: R) => void) => void} task task to run
 * @param {(err?: E | null, result?: R) => void} callback called when the task is done
 * @returns {void}
 */
const runTask = (task, callback) => task(callback);

/**
 * Runs every task in parallel and collects the results in task order.
 * @template R
 * @template E
 * @param {((callback: (err?: E | null, result?: R) => void) => void)[]} tasks tasks to run
 * @param {(err?: E | null, results?: R[]) => void} callback called with every result, or with the first error
 * @returns {void}
 */
const parallel = (tasks, callback) => map(tasks, runTask, callback);

module.exports.each = each;
module.exports.eachLimit = eachLimit;
module.exports.map = map;
module.exports.parallel = parallel;
