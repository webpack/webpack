"use strict";

/**
 * @returns {string} a root whose one attribute references a 400000-character entity
 */
const source = () =>
	`<!DOCTYPE root [<!ENTITY value "${"x".repeat(400000)}">]><root value="&value;"/>`;

module.exports = { source };
