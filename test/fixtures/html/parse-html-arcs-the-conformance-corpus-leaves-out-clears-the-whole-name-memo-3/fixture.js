"use strict";

/**
 * @returns {string} 512 unknown start tags, `z` repeated 1 to 512 times
 */
const source = () => {
	let html = "";
	for (let n = 1; n <= 512; n++) html += `<${"z".repeat(n)}>`;
	return html;
};

module.exports = {
	source
};
