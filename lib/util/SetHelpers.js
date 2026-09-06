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
 * Defines the result of bounded set intersection discovery.
 * @template T
 * @typedef {object} FindIntersectionsResult
 * @property {Set<T>[]} sets the additional sets
 * @property {{ key: bigint, set: Set<T> }[]} entries the keyed additional sets
 * @property {number} pairs the number of intersected pairs
 * @property {number} comparisons the number of membership checks
 * @property {boolean} limited whether discovery reached a limit
 */

/**
 * Discovers proper intersections that are not already present in the input.
 * Work and additional memory are bounded while every original set is retained.
 * @template T
 * @param {Map<bigint, Set<T>>} setsByKey original sets keyed by membership bit masks
 * @param {object} options discovery options
 * @param {number} options.minimumSize minimum size of an intersection
 * @param {number} options.maximumCandidates maximum number of additional sets
 * @param {number} options.maximumPairs maximum number of intersected pairs
 * @param {number} options.maximumComparisons maximum number of membership checks
 * @returns {FindIntersectionsResult<T>} discovered set intersections
 */
const findIntersections = (setsByKey, options) => {
	const { minimumSize, maximumCandidates, maximumPairs, maximumComparisons } =
		options;
	/** @type {{ key: bigint, set: Set<T> }[]} */
	const candidates = [];
	/** @type {Set<bigint>} */
	const knownKeys = new Set();
	for (const [key, set] of setsByKey) {
		knownKeys.add(key);
		if (set.size > minimumSize) candidates.push({ key, set });
	}
	candidates.sort((a, b) => {
		const sizeDifference = b.set.size - a.set.size;
		return sizeDifference || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
	});

	const originalCount = candidates.length;
	/** @type {Set<T>[]} */
	const intersections = [];
	let pairs = 0;
	let comparisons = 0;
	let limited = false;
	let currentIndex = 0;

	search: while (currentIndex < candidates.length) {
		const current = candidates[currentIndex];
		if (current.set.size <= minimumSize) {
			currentIndex++;
			continue;
		}
		const end = Math.min(currentIndex, originalCount);
		for (let otherIndex = 0; otherIndex < end; otherIndex++) {
			if (intersections.length >= maximumCandidates || pairs >= maximumPairs) {
				limited = true;
				break search;
			}
			const other = candidates[otherIndex];
			const smaller =
				current.set.size < other.set.size ? current.set : other.set;
			if (comparisons + smaller.size > maximumComparisons) {
				limited = true;
				break search;
			}
			pairs++;
			comparisons += smaller.size;
			const key = current.key & other.key;
			if (knownKeys.has(key)) continue;
			let remaining = key;
			let size = 0;
			while (remaining !== BIGINT_ZERO && size < minimumSize) {
				remaining &= remaining - BIGINT_ONE;
				size++;
			}
			if (size < minimumSize) continue;
			const larger = smaller === current.set ? other.set : current.set;
			/** @type {Set<T>} */
			const intersection = new Set();
			for (const item of smaller) {
				if (larger.has(item)) intersection.add(item);
			}
			knownKeys.add(key);
			intersections.push(intersection);
			candidates.push({ key, set: intersection });
		}
		currentIndex++;
	}

	return {
		sets: intersections,
		entries: candidates.slice(originalCount),
		pairs,
		comparisons,
		limited
	};
};

/**
 * Defines the result of bounded intersection propagation.
 * @template T
 * @typedef {object} AssociateIntersectionsResult
 * @property {Map<bigint, Set<T>[]>} intersectionsByOriginalKey additional subsets by original set key
 * @property {number} checks the number of possible containing sets checked
 * @property {number} comparisons the maximum number of membership checks performed
 * @property {number} expansions the weighted number of downstream visits
 * @property {boolean} limited whether propagation reached a limit
 */

/**
 * Associates discovered intersections with original sets that contain them.
 * The rarest item in each intersection provides an inverted-index posting list,
 * avoiding a scan of every intersection against every original set.
 * @template T
 * @param {Map<bigint, Set<T>>} originalsByKey original sets
 * @param {{ key: bigint, set: Set<T> }[]} intersections discovered intersections
 * @param {Map<bigint, number>} originalWeightsByKey downstream visit weight by original set key
 * @param {object} options propagation options
 * @param {number} options.maximumChecks maximum number of possible containing sets checked
 * @param {number} options.maximumComparisons maximum number of membership checks
 * @param {number} options.maximumExpansions maximum weighted number of downstream visits
 * @returns {AssociateIntersectionsResult<T>} intersections grouped by original set key
 */
const associateIntersections = (
	originalsByKey,
	intersections,
	originalWeightsByKey,
	options
) => {
	const { maximumChecks, maximumComparisons, maximumExpansions } = options;
	/** @type {Map<T, bigint[]>} */
	const originalKeysByItem = new Map();
	for (const [key, original] of originalsByKey) {
		for (const item of original) {
			const originals = originalKeysByItem.get(item);
			if (originals === undefined) {
				originalKeysByItem.set(item, [key]);
			} else {
				originals.push(key);
			}
		}
	}

	const orderedIntersections = [...intersections].sort((a, b) => {
		const sizeDifference = b.set.size - a.set.size;
		return sizeDifference || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
	});
	/** @type {Map<bigint, Set<T>[]>} */
	const intersectionsByOriginalKey = new Map();
	let checks = 0;
	let comparisons = 0;
	let expansions = 0;
	let limited = false;

	search: for (const { set: intersection } of orderedIntersections) {
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

		// Publish only after the complete posting list is checked. Hitting a
		// limit cannot leave an intersection attached to only some originals.
		/** @type {bigint[]} */
		const matches = [];
		let candidateExpansions = 0;
		for (const key of possibleOriginalKeys) {
			const original = /** @type {Set<T>} */ (originalsByKey.get(key));
			if (original.size <= intersection.size) continue;
			if (
				checks >= maximumChecks ||
				comparisons + intersection.size > maximumComparisons
			) {
				limited = true;
				break search;
			}
			checks++;
			comparisons += intersection.size;
			if (isSubset(original, intersection)) {
				const weightedExpansions =
					candidateExpansions +
					/** @type {number} */ (originalWeightsByKey.get(key));
				if (expansions + weightedExpansions > maximumExpansions) {
					limited = true;
					break search;
				}
				candidateExpansions = weightedExpansions;
				matches.push(key);
			}
		}
		expansions += candidateExpansions;
		for (const key of matches) {
			const intersectionsForOriginal = intersectionsByOriginalKey.get(key);
			if (intersectionsForOriginal === undefined) {
				intersectionsByOriginalKey.set(key, [intersection]);
			} else {
				intersectionsForOriginal.push(intersection);
			}
		}
	}

	return {
		intersectionsByOriginalKey,
		checks,
		comparisons,
		expansions,
		limited
	};
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
