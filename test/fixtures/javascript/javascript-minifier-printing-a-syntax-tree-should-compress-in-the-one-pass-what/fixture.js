"use strict";

/**
 * @returns {string} a function whose one read of `o` sits 3000 calls after its declaration
 */
const source = () =>
	`function f(p){var o=[p];${"g();".repeat(3000)}h(o)}`;

module.exports = { source };
