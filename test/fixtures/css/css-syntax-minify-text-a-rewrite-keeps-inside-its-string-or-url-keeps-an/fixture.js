"use strict";

const rule = '[x=")}.x{color:red}"]';

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`.p{${rule}{background:url(data:image/svg+xml,%3Csvg/%3E)}}`;

module.exports = { source };
