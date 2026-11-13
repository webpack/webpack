"use strict";

/**
 * @returns {string} a doctype declaring an entity named with each code unit a name can hold
 */
const source = () => {
	// What a declaration cannot name an entity with, so nothing resolves it.
	const undeclared = /[\0\t\n\r "'/<=>?[\]]/;
	let subset = "";
	for (let unit = 0; unit < 0x10000; unit++) {
		const character = String.fromCharCode(unit);
		if (!undeclared.test(character)) subset += `<!ENTITY n${character}m "1">`;
	}
	return `<!DOCTYPE r [${subset}]><r/>`;
};

module.exports = { source };
