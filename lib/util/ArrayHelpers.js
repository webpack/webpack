/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

/**
 * Compare two arrays or strings by performing strict equality check for each value.
 * @template T
 * @param {ArrayLike<T>} a Array of values to be compared
 * @param {ArrayLike<T>} b Array of values to be compared
 * @returns {boolean} returns true if all the elements of passed arrays are strictly equal.
 */
export const equals = (a, b) => {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
};
