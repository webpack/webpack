"use strict";
const primes = [
	9833,
	9839,
	9851,
	9857,
	9859,
	9871,
	9883,
	9887,
	9901,
	9907,
	9923,
	9929
];

module.exports = (str, range) => {
	let acc = 0;
	for (let i = 0; i < str.length; i++) {
		acc = (acc + str.charCodeAt(i) * primes[i % primes.length]) % range;
	}
	return acc;
};
