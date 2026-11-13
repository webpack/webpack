"use strict";

/**
 * @param {number} depth how many disjunctions enclose the group
 * @param {string} name the group's name
 * @returns {string} one named group, nested that deep
 */
const nest = (depth, name) =>
	`${"(?:".repeat(depth)}(?<${name}>a)${")".repeat(depth)}`;

/**
 * @returns {string} a regexp literal of 160 alternatives, each a group named `x` nested 160 deep, so every name repeats
 */
const source = () =>
	`/${Array.from({ length: 160 }, () => nest(160, "x")).join("|")}/v;`;

module.exports = { source };
