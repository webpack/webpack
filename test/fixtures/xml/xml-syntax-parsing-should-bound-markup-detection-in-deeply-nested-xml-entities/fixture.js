"use strict";

/**
 * @returns {string} a document whose entities nest 10000 deep before markup
 */
const source = () => {
	const declarations = [];
	for (let i = 0; i < 10000; i++) {
		declarations.push(`<!ENTITY e${i} "&e${i + 1};">`);
	}
	return `<!DOCTYPE root [${declarations.join("")}<!ENTITY e10000 "<child/>">]><root>&e0;<after/></root>`;
};

module.exports = { source };
