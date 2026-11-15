"use strict";

const BIG = Array.from(
	{ length: 1700 },
	(_, i) => `.c${i}>d${i}{color:red;margin:${i + 1}px}`
).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`.p{@supports (display:grid){@laye x{@layer x{}@layer x{@layer x,{}@laye x{@layer x{}@layer x{@layer x,{}}@media print{@media (width>=1px){:--h{b:c}}@custom-selector( :--h1}@media print{@media (width>=1px){:--h{b:c}}@custom-selector :--h1}${BIG}}`;

module.exports = { source };
