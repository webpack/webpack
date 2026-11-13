"use strict";

/**
 * @returns {string} `<svg><g>` nested 20000 deep around one character
 */
const source = () =>
	`${"<svg><g>".repeat(20000)}x${"</g></svg>".repeat(20000)}`;

module.exports = { source };
