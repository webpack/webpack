"use strict";

/**
 * @returns {string} a list of 40000 items, past the node count where the walk streams
 */
const source = () =>
	`<ul>${"<li>x</li>".repeat(40000)}</ul>`;

module.exports = { source };
