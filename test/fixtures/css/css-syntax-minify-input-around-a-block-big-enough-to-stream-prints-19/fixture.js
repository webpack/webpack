"use strict";

const BIG = Array.from(
	{ length: 1700 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`@media print{.p{.a{x:}@st(arting-style{y:2}.a{x:1}@starting-style{y:2}}${BIG}}}`;

module.exports = { source };
