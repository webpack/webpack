"use strict";

const rules = Array.from(
	{ length: 4000 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
);

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `.p{color:blue;${rules.join("")}}`;

module.exports = { source };
