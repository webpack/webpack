"use strict";

/**
 * @returns {string} a 3.2 MB comment, then one paragraph
 */
const source = () => `<!--${"x".repeat(3200000)}--><p>x</p>`;

module.exports = {
	source
};
