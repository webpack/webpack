/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

exports.equals = (a, b) => {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
};

/**
 *
 * @param {Array} arr Array of values to be partitioned
 * @param {(value: any) => boolean} fn Partition function which partitions based on truthiness of result.
 * @returns {[Array, Array]} returns the values of `arr` partitioned into two new arrays based on fn predicate.
 */
exports.groupBy = (arr = [], fn) => {
	return arr.reduce(
		(groups, value) => {
			groups[fn(value) ? 0 : 1].push(value);
			return groups;
		},
		[[], []]
	);
};
