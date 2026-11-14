"use strict";

/**
 * @returns {string} a font-size fallback and its negative override with 33 custom properties between
 */
const source = () => {
	const properties = [];
	for (let i = 0; i < 33; i++) properties.push(`--p${i}:${i}`);
	return `a{font-size:12px;${properties.join(";")};font-size:-1px}`;
};

module.exports = { source };
