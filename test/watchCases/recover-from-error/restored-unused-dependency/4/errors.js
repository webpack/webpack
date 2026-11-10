"use strict";

// other.js and swap.js both miss swap-b.js, swap.js also misses swap-d.js
const errors = ["swap-b.js", "swap-b.js", "swap-d.js"].map((request) => [
	/Module not found/,
	new RegExp(`Can't resolve '\\./${request}'`)
]);

module.exports = [...errors, ...errors];
