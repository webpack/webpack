/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SAFE_LIMIT = 0x80000000;
const SAFE_PART = SAFE_LIMIT - 1;
const COUNT = 4;
const arr = [0, 0, 0, 0, 0];
const primes = [3, 7, 17, 19];

module.exports = (str, range) => {
	arr.fill(0);
	for (let i = 0; i < str.length; i++) {
		const c = str.charCodeAt(i);
		for (let j = 0; j < COUNT; j++) {
			const p = (j + COUNT - 1) % COUNT;
			arr[j] = (arr[j] + c * primes[j] + arr[p]) & SAFE_PART;
		}
		for (let j = 0; j < COUNT; j++) {
			const q = arr[j] % COUNT;
			arr[j] = arr[j] ^ (arr[q] >> 1);
		}
	}
	if (range <= SAFE_PART) {
		let sum = 0;
		for (let j = 0; j < COUNT; j++) {
			sum = (sum + arr[j]) % range;
		}
		return sum;
	} else {
		let sum1 = 0;
		let sum2 = 0;
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
