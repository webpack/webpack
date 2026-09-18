/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const BIGINT_ZERO = BigInt("0");
const BIGINT_ONE = BigInt("1");

/**
 * intersect creates Set containing the intersection of elements between all sets
 * @template T
 * @param {Set<T>[]} sets an array of sets being checked for shared elements
 * @returns {Set<T>} returns a new Set containing the intersecting items
 */
const intersect = (sets) => {
	if (sets.length === 0) return new Set();
	if (sets.length === 1) return new Set(sets[0]);
	let minSize = Infinity;
	let minIndex = -1;
	for (let i = 0; i < sets.length; i++) {
		const size = sets[i].size;
		if (size < minSize) {
			minIndex = i;
			minSize = size;
		}
	}
	const current = new Set(sets[minIndex]);
	for (let i = 0; i < sets.length; i++) {
		if (i === minIndex) continue;
		const set = sets[i];
		for (const item of current) {
			if (!set.has(item)) {
				current.delete(item);
			}
		}
	}
	return current;
};

/**
 * Discovers proper intersections in frozen rounds, stopping at the requested depth.
 * @template T
 * @param {Map<bigint, Set<T>>} setsByKey original sets keyed by membership bit masks
 * @param {object} options discovery options
 * @param {number} options.minimumSize minimum intersection size
 * @param {number} options.dedupDepth maximum number of discovery rounds
 * @returns {{ key: bigint, set: Set<T> }[]} additional intersections
 */
const findIntersections = (setsByKey, { minimumSize, dedupDepth }) => {
	minimumSize = Math.max(1, minimumSize);
	const candidates = [...setsByKey].map(([key, set]) => ({ key, set }));
	candidates.sort(
		(a, b) =>
			b.set.size - a.set.size || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
	);
	const originalCount = candidates.length;
	const knownKeys = new Set(setsByKey.keys());
	let first = 0;
	for (let round = 0; round < dedupDepth; round++) {
		const end = candidates.length;
		for (let i = first; i < end; i++) {
			const current = candidates[i];
			if (current.set.size <= minimumSize) continue;
			for (let j = 0; j < i; j++) {
				const other = candidates[j];
				if (other.set.size <= minimumSize) continue;
				const key = current.key & other.key;
				if (key === BIGINT_ZERO || knownKeys.has(key)) continue;
				let remaining = key;
				let size = 0;
				while (remaining !== BIGINT_ZERO && size < minimumSize) {
					remaining &= remaining - BIGINT_ONE;
					size++;
				}
				if (size < minimumSize) continue;
				const smaller =
					current.set.size < other.set.size ? current.set : other.set;
				const larger = smaller === current.set ? other.set : current.set;
				const intersection = new Set();
				for (const item of smaller) {
					if (larger.has(item)) intersection.add(item);
				}
				knownKeys.add(key);
				candidates.push({ key, set: intersection });
			}
		}
		if (candidates.length === end) break;
		first = end;
	}
	return candidates.slice(originalCount);
};

/**
 * Associates each intersection with every containing original set using rare-item postings.
 * @template T
 * @param {Map<bigint, Set<T>>} originalsByKey original sets
 * @param {{ key: bigint, set: Set<T> }[]} intersections additional intersections
 * @returns {Map<bigint, Set<T>[]>} additional subsets by original key
 */
const associateIntersections = (originalsByKey, intersections) => {
	/** @type {Map<T, bigint[]>} */
	const originalKeysByItem = new Map();
	for (const [key, original] of originalsByKey) {
		for (const item of original) {
			const originals = originalKeysByItem.get(item);
			if (originals === undefined) originalKeysByItem.set(item, [key]);
			else originals.push(key);
		}
	}
	const ordered = [...intersections].sort(
		(a, b) =>
			b.set.size - a.set.size || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
	);
	/** @type {Map<bigint, Set<T>[]>} */
	const result = new Map();
	for (const { set: intersection } of ordered) {
		/** @type {bigint[] | undefined} */
		let possibleOriginalKeys;
		for (const item of intersection) {
			const originals = originalKeysByItem.get(item);
			if (originals === undefined) {
				possibleOriginalKeys = undefined;
				break;
			}
			if (
				possibleOriginalKeys === undefined ||
				originals.length < possibleOriginalKeys.length
			) {
				possibleOriginalKeys = originals;
			}
		}
		if (possibleOriginalKeys === undefined) continue;
		for (const key of possibleOriginalKeys) {
			const original = /** @type {Set<T>} */ (originalsByKey.get(key));
			if (
				original.size <= intersection.size ||
				!isSubset(original, intersection)
			) {
				continue;
			}
			const subsets = result.get(key);
			if (subsets === undefined) result.set(key, [intersection]);
			else subsets.push(intersection);
		}
	}
	return result;
};

/**
 * Checks if a set is the subset of another set
 * @template T
 * @param {Set<T>} bigSet a Set which contains the original elements to compare against
 * @param {Set<T>} smallSet the set whose elements might be contained inside of bigSet
 * @returns {boolean} returns true if bigSet contains all elements inside of smallSet
 */
const isSubset = (bigSet, smallSet) => {
	if (bigSet.size < smallSet.size) return false;
	for (const item of smallSet) {
		if (!bigSet.has(item)) return false;
	}
	return true;
};

/**
 * Returns found item.
 * @template T
 * @param {Set<T>} set a set
 * @param {(set: T) => boolean} fn selector function
 * @returns {T | undefined} found item
 */
const find = (set, fn) => {
	for (const item of set) {
		if (fn(item)) return item;
	}
};

/**
 * Returns first item.
 * @template T
 * @param {Set<T> | ReadonlySet<T>} set a set
 * @returns {T | undefined} first item
 */
const first = (set) => {
	const entry = set.values().next();
	return entry.done ? undefined : entry.value;
};

/**
 * Returns combined set, may be identical to a or b.
 * @template T
 * @param {Set<T>} a first
 * @param {Set<T>} b second
 * @returns {Set<T>} combined set, may be identical to a or b
 */
const combine = (a, b) => {
	if (b.size === 0) return a;
	if (a.size === 0) return b;
	const set = new Set(a);
	for (const item of b) set.add(item);
	return set;
};

module.exports.associateIntersections = associateIntersections;
module.exports.combine = combine;
module.exports.find = find;
module.exports.findIntersections = findIntersections;
module.exports.first = first;
module.exports.intersect = intersect;
module.exports.isSubset = isSubset;
