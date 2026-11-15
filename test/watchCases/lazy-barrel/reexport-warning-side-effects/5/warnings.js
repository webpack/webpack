"use strict";

// one per barrel shape, from the two configs reporting warnings
const warnings = [1, 2, 3, 4].map(() => [
	/export '(b|default)' .*was not found in '\.\/target'/
]);

module.exports = [...warnings, ...warnings];
