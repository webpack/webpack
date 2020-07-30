/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SortableSet = require("./SortableSet");

/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compilation").EntryOptions} EntryOptions */

/** @typedef {string | SortableSet<string> | undefined} RuntimeSpec */

/**
 * @param {Compilation} compilation the compilation
 * @param {string} name name of the entry
 * @param {EntryOptions=} options optionally already received entry options
 * @returns {RuntimeSpec} runtime
 */
exports.getEntryRuntime = (compilation, name, options) => {
	let dependOn;
	let runtime;
	if (options) {
		({ dependOn, runtime } = options);
	} else {
		const entry = compilation.entries.get(name);
		if (!entry) return name;
		({ dependOn, runtime } = entry.options);
	}
	if (dependOn) {
		/** @type {RuntimeSpec} */
		let result = undefined;
		const queue = new Set(dependOn);
		for (const name of queue) {
			const dep = compilation.entries.get(name);
			if (!dep) continue;
			const { dependOn, runtime } = dep.options;
			if (dependOn) {
				for (const name of dependOn) {
					queue.add(name);
				}
			} else {
				result = mergeRuntimeOwned(result, runtime || name);
			}
		}
		return result;
	} else {
		return runtime || name;
	}
};

/**
 * @param {RuntimeSpec} runtime runtime
 * @param {function(string): void} fn functor
 * @returns {void}
 */
exports.forEachRuntime = (runtime, fn) => {
	if (runtime === undefined) {
		fn(undefined);
	} else if (typeof runtime === "string") {
		fn(runtime);
	} else {
		for (const r of runtime) {
			fn(r);
		}
	}
};

const getRuntimesKey = set => {
	set.sort();
	return Array.from(set).join("\n");
};

/**
 * @param {RuntimeSpec} runtime runtime(s)
 * @returns {string} key of runtimes
 */
const getRuntimeKey = runtime => {
	if (runtime === undefined) return "*";
	if (typeof runtime === "string") return runtime;
	return runtime.getFromUnorderedCache(getRuntimesKey);
};
exports.getRuntimeKey = getRuntimeKey;

const getRuntimesString = set => {
	set.sort();
	return Array.from(set).join("+");
};

/**
 * @param {RuntimeSpec} runtime runtime(s)
 * @returns {string} readable version
 */
exports.runtimeToString = runtime => {
	if (runtime === undefined) return "*";
	if (typeof runtime === "string") return runtime;
	return runtime.getFromUnorderedCache(getRuntimesString);
};

/**
 * @param {RuntimeSpec} a first
 * @param {RuntimeSpec} b second
 * @returns {boolean} true, when they are equal
 */
exports.runtimeEqual = (a, b) => {
	if (a === b) {
		return true;
	} else if (
		a === undefined ||
		b === undefined ||
		typeof a === "string" ||
		typeof b === "string"
	) {
		return false;
	} else if (a.size !== b.size) {
		return false;
	} else {
		a.sort();
		b.sort();
		const aIt = a[Symbol.iterator]();
		const bIt = b[Symbol.iterator]();
		for (;;) {
			const aV = aIt.next();
			if (aV.done) return true;
			const bV = bIt.next();
			if (aV.value !== bV.value) return false;
		}
	}
};

/**
 * @param {RuntimeSpec} a first
 * @param {RuntimeSpec} b second
 * @returns {-1|0|1} compare
 */
exports.compareRuntime = (a, b) => {
	if (a === b) {
		return 0;
	} else if (a === undefined) {
		return -1;
	} else if (b === undefined) {
		return 1;
	} else {
		const aKey = getRuntimeKey(a);
		const bKey = getRuntimeKey(b);
		if (aKey < bKey) return -1;
		if (aKey > bKey) return 1;
		return 0;
	}
};

/**
 * @param {RuntimeSpec} a first
 * @param {RuntimeSpec} b second
 * @returns {RuntimeSpec} merged
 */
const mergeRuntime = (a, b) => {
	if (a === undefined) {
		return b;
	} else if (b === undefined) {
		return a;
	} else if (a === b) {
		return a;
	} else if (typeof a === "string") {
		if (typeof b === "string") {
			const set = new SortableSet();
			set.add(a);
			set.add(b);
			return set;
		} else if (b.has(a)) {
			return b;
		} else {
			const set = new SortableSet(b);
			set.add(a);
			return set;
		}
	} else {
		if (typeof b === "string") {
			if (a.has(b)) return a;
			const set = new SortableSet(a);
			set.add(b);
			return set;
		} else {
			const set = new SortableSet(a);
			for (const item of b) set.add(item);
			if (set.size === a.size) return a;
			return set;
		}
	}
};
exports.mergeRuntime = mergeRuntime;

/**
 * @param {RuntimeSpec} a first (may be modified)
 * @param {RuntimeSpec} b second
 * @returns {RuntimeSpec} merged
 */
const mergeRuntimeOwned = (a, b) => {
	if (b === undefined) {
		return a;
	} else if (a === b) {
		return a;
	} else if (a === undefined) {
		if (typeof b === "string") {
			const set = new SortableSet();
			set.add(b);
			return set;
		} else {
			return new SortableSet(b);
		}
	} else if (typeof a === "string") {
		if (typeof b === "string") {
			const set = new SortableSet();
			set.add(a);
			set.add(b);
			return set;
		} else {
			const set = new SortableSet(b);
			set.add(a);
			return set;
		}
	} else {
		if (typeof b === "string") {
			a.add(b);
			return a;
		} else {
			for (const item of b) a.add(item);
			return a;
		}
	}
};
exports.mergeRuntimeOwned = mergeRuntimeOwned;

/**
 * @param {RuntimeSpec} a first
 * @param {RuntimeSpec} b second
 * @returns {RuntimeSpec} merged
 */
exports.intersectRuntime = (a, b) => {
	if (a === undefined) {
		return b;
	} else if (b === undefined) {
		return a;
	} else if (a === b) {
		return a;
	} else if (typeof a === "string") {
		if (typeof b === "string") {
			return undefined;
		} else if (b.has(a)) {
			return a;
		} else {
			return undefined;
		}
	} else {
		if (typeof b === "string") {
			if (a.has(b)) return b;
			return undefined;
		} else {
			const set = new SortableSet();
			for (const item of b) {
				if (a.has(item)) set.add(item);
			}
			if (set.size === 0) return undefined;
			if (set.size === 1) for (const item of set) return item;
			return set;
		}
	}
};

/**
 * @template T
 */
class RuntimeSpecMap {
	/**
	 * @param {RuntimeSpecMap<T>=} clone copy form this
	 */
	constructor(clone) {
		/** @type {Map<string, T>} */
		this._map = new Map(clone ? clone._map : undefined);
	}

	/**
	 * @param {RuntimeSpec} runtime the runtimes
	 * @returns {T} value
	 */
	get(runtime) {
		const key = getRuntimeKey(runtime);
		return this._map.get(key);
	}

	/**
	 * @param {RuntimeSpec} runtime the runtimes
	 * @returns {boolean} true, when the runtime is stored
	 */
	has(runtime) {
		const key = getRuntimeKey(runtime);
		return this._map.has(key);
	}

	set(runtime, value) {
		this._map.set(getRuntimeKey(runtime), value);
	}

	delete(runtime) {
		this._map.delete(getRuntimeKey(runtime));
	}

	update(runtime, fn) {
		const key = getRuntimeKey(runtime);
		const oldValue = this._map.get(key);
		const newValue = fn(oldValue);
		if (newValue !== oldValue) this._map.set(key, newValue);
	}

	keys() {
		return Array.from(this._map.keys(), key => {
			if (key === "*") return undefined;
			const items = key.split("\n");
			if (items.length === 1) return items[0];
			return new SortableSet(items);
		});
	}

	values() {
		return this._map.values();
	}
}

exports.RuntimeSpecMap = RuntimeSpecMap;

class RuntimeSpecSet {
	constructor(iterable) {
		/** @type {Map<string, RuntimeSpec>} */
		this._map = new Map();
		if (iterable) {
			for (const item of iterable) {
				this.add(item);
			}
		}
	}

	add(runtime) {
		this._map.set(getRuntimeKey(runtime), runtime);
	}

	[Symbol.iterator]() {
		return this._map.values();
	}

	get size() {
		return this._map.size;
	}
}

exports.RuntimeSpecSet = RuntimeSpecSet;
