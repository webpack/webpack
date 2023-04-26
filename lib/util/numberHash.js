/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * The maximum safe integer value for 32-bit integers.
 * @type {number}
 */
const SAFE_LIMIT = 0x80000000;

/**
 * The maximum safe integer value for 32-bit integers minus one. This is used
 * in the algorithm to ensure that intermediate hash values do not exceed the
 * 32-bit integer limit.
 * @type {number}
 */
const SAFE_PART = SAFE_LIMIT - 1;

/**
 * The number of 32-bit integers used to store intermediate hash values.
 * @type {number}
 */
const COUNT = 4;

/**
 * An array used to store intermediate hash values during the calculation.
 * @type {number[]}
 */
const arr = [0, 0, 0, 0, 0];

/**
 * An array of prime numbers used in the hash calculation.
 * @type {number[]}
 */
const primes = [3, 7, 17, 19];

/**
 * Computes a hash value for the given string and range. This hashing algorithm is a modified
 * version of the [FNV-1a algorithm](https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function).
 * It is optimized for speed and does **not** generate a cryptographic hash value.
 *
 * We use `numberHash` in `lib/ids/IdHelpers.js` to generate hash values for the module identifier. The generated
 * hash is used as a prefix for the module id's to avoid collisions with other modules.
 *
 * @param {string} str The input string to hash.
 * @param {number} range The range of the hash value (0 to range-1).
 * @returns {number} - The computed hash value.
 *
 * @example
 *
 * ```js
 * const numberHash = require("webpack/lib/util/numberHash");
 * numberHash("hello", 1000); // 57
 * numberHash("hello world"); // 990
 * ```
 *
 */
module.exports = (str, range) => {
	/**
	 * Initialize the array with zeros before it is used
	 * to store intermediate hash values.
	 */
	arr.fill(0);
	// For each character in the string
	for (let i = 0; i < str.length; i++) {
		// Get the character code.
		const c = str.charCodeAt(i);
		// For each 32-bit integer used to store the hash value
		for (let j = 0; j < COUNT; j++) {
			// Get the index of the previous 32-bit integer.
			const p = (j + COUNT - 1) % COUNT;
			// Add the character code to the current hash value and multiply by the prime number.
			arr[j] = (arr[j] + c * primes[j] + arr[p]) & SAFE_PART;
		}

		// For each 32-bit integer used to store the hash value
		for (let j = 0; j < COUNT; j++) {
			// Get the index of the next 32-bit integer.
			const q = arr[j] % COUNT;
			// XOR the current hash value with the value of the next 32-bit integer.
			arr[j] = arr[j] ^ (arr[q] >> 1);
		}
	}

	if (range <= SAFE_PART) {
		let sum = 0;
		// For each 32-bit integer used to store the hash value
		for (let j = 0; j < COUNT; j++) {
			// Add the value of the current 32-bit integer to the sum.
			sum = (sum + arr[j]) % range;
		}
		return sum;
	} else {
		let sum1 = 0;
		let sum2 = 0;
		// Calculate the range extension.
		const rangeExt = Math.floor(range / SAFE_LIMIT);
		for (let j = 0; j < COUNT; j += 2) {
			sum1 = (sum1 + arr[j]) & SAFE_PART;
		}
		for (let j = 1; j < COUNT; j += 2) {
			sum2 = (sum2 + arr[j]) % rangeExt;
		}
		return (sum2 * SAFE_LIMIT + sum1) % range;
	}
};
