"use strict";

/**
 * @returns {string} 33000 elements of two attributes each: past the columns' shrink threshold
 */
const source = () => "<i a b></i>".repeat(33000);

module.exports = {
	source
};
