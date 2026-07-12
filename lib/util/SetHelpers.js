/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

/**
 * intersect creates Set containing the intersection of elements between all sets
 * @template T
 * @param {Set<T>[]} sets an array of sets being checked for shared elements
 * @returns {Set<T>} returns a new Set containing the intersecting items
 */
const intersect = (sets) => {
	if (sets.length === 0) return new Set();
	if (sets.length === 1) return new Set(sets[0]);
	let current = sets[0];
	for (let i = 1; i < sets.length; i++) {
		current = current.intersection(sets[i]);
	}
	return current;
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
	return a.union(b);
};

export { combine };
export { first };
export { intersect };
