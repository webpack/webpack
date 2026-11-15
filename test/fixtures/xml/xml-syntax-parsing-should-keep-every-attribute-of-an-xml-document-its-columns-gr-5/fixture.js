"use strict";

/**
 * @returns {string} a dense start of attributes before a long text
 */
const source = () => {
	let out = "<r>";
	for (let i = 0; i < 700; i++) {
		out += `<a b="" c="${i}" d="" e="" f="" g="${i}"/>`;
	}
	return `${out}${"t".repeat(100000)}<z y="1"/></r>`;
};

module.exports = { source };
