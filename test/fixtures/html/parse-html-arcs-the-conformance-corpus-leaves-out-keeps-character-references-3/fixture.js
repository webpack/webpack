"use strict";

/**
 * @param {string[]} values the run's answer
 * @returns {{ asserted: unknown[] }} the run's tree
 */
const documentTree = (values) => ({ asserted: [values[0]] });

module.exports = {
	documentTree
};
