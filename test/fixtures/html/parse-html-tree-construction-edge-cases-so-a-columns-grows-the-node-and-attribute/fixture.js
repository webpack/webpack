"use strict";

/**
 * @returns {string} 5000 elements, each with one attribute
 */
const source = () => {
	let html = "";
	for (let i = 0; i < 5000; i++) html += `<i data-n="${i}"></i>`;
	return html;
};

module.exports = {
	source
};
