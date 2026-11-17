"use strict";

/**
 * @returns {string} `&n<unit>m;` for each code unit, five units apiece
 */
const source = () => {
	let out = "";
	for (let unit = 0; unit < 0x10000; unit++) {
		out += `&n${String.fromCharCode(unit)}m;`;
	}
	return out;
};

module.exports = { source };
