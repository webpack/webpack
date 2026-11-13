"use strict";

/**
 * @returns {string} one tag holding 4200 attributes
 */
const source = () => {
	let out = "<r";
	for (let i = 0; i < 4200; i++) out += ` a${i}="${i}"`;
	return `${out}/>`;
};

module.exports = { source };
