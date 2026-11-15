"use strict";

/**
 * @returns {string} 70000 elements, each with one attribute: past the columns' shrink threshold
 */
const source = () => {
	let html = "";
	for (let i = 0; i < 70000; i++) html += `<i data-n="${i}"></i>`;
	return html;
};

module.exports = {
	source
};
