"use strict";

const url = "url(data:image/svg+xml,%3Csvg/%3E)";

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`.a{color-scheme:light dark;color:light-dark(red,blue);background:${url}}`;

module.exports = { source };
