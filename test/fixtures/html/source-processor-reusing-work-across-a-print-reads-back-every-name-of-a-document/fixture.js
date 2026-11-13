"use strict";

/**
 * @returns {string} a body of 512 custom elements, `x-` and `a` repeated 1 to 512 times
 */
const source = () => {
	let html = "<body>";
	for (let i = 1; i <= 512; i++) {
		html += `<x-${"a".repeat(i)}></x-${"a".repeat(i)}>`;
	}
	return html;
};

module.exports = {
	source
};
