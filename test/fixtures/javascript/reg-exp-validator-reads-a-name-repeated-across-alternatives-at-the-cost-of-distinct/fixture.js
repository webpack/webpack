"use strict";

/**
 * @param {number} depth how many disjunctions enclose the group
 * @param {string} name the group's name
 * @returns {string} one named group, nested that deep
 */
const nest = (depth, name) =>
	`${"(?:".repeat(depth)}(?<${name}>a)${")".repeat(depth)}`;

/**
 * @returns {string} a regexp literal of 160 alternatives, each a group of its own name nested 160 deep
 */
const source = () =>
	`/${Array.from({ length: 160 }, (_, i) => nest(160, `x${i}`)).join("|")}/v;`;

module.exports = { source };
