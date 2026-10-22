"use strict";

const CONFLICT = [
	/Entry "main" contains conflicting exports for the name 'shared'/
];

// One per library type built here.
module.exports = Array.from({ length: 19 }, () => CONFLICT);
