"use strict";

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	Array.from({ length: 5000 }, (_, i) => `.a${i}{width:${(i + 1) / 7}em}`).join(
		""
	);

module.exports = { source };
