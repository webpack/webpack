"use strict";

const { repeat } = require("../_shared/record");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`.root{${repeat(
		20000,
		(i) => `--v${i}:${i};`
	)}margin-top:1px;margin-right:2px;margin-bottom:3px;margin-left:4px}`;

module.exports = { source };
