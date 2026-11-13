"use strict";

const BIG = Array.from(
	{ length: 4000 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@supports (a:b){@scope (.x){@layer l{}{}@scope (.x){@layer l{}{}${BIG}}`;

module.exports = { source };
