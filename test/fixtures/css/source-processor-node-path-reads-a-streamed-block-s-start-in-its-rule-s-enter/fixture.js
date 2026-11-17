"use strict";

/**
 * @returns {string} an `@media` block of 1800 rules, past the streaming threshold
 */
const source = () =>
	`@media screen{${Array.from({ length: 1800 }, (_, i) => `.c${i}{color:red}`).join("")}}`;

module.exports = { source };
