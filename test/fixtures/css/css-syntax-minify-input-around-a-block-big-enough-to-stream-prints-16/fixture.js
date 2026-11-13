"use strict";

const BIG = Array.from(
	{ length: 1700 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`.p{a{top:calc(1px + 1%);right:anchor(top);bottom:calc(1px + 1%);left:anchor(top)}${BIG}@media print{a{co}lor:color-mix(in srgb,#123,red)}a{co}lor:color-mix(in srgb,#123,blue)}}}`;

module.exports = { source };
