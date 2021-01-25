/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @template K
 * @template V
 * @param {Map<K, V>} map a map
 * @param {K} key the key
 * @param {function(): V} computer compute value
 * @returns {V} value
 */
exports.provide = (map, key, computer) => {
	const value = map.get(key);
	if (value !== undefined) return value;
	const newValue = computer();
	map.set(key, newValue);
	return newValue;
};
