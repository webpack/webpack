"use strict";

/**
 * @returns {string} 660 elements of 100 attributes each, more than the columns are kept at, then a start tag the input cuts off
 */
const source = () =>
	`${(() => {
	let src = "";
	for (let i = 0; i < 660; i++) {
		src += "<i";
		for (let j = 0; j < 100; j++) src += ` data-${i}-${j}="1"`;
		src += "></i>";
	}
	return src;
})()}<b class="c" class="d"`;

/**
 * @param {{ code: string }} result what the printer returned
 * @returns {{ asserted: unknown[] }} the code
 */
const printed = (result) => ({ asserted: [result.code] });

module.exports = {
	printed,
	source
};
