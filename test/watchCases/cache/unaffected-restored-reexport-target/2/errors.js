"use strict";

const errors = [1, 2, 3, 4].map(() => [
	/Module not found/,
	/Can't resolve '\.\/target'/
]);

module.exports = [...errors, ...errors];
