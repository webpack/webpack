"use strict";

/**
 * @returns {string} the upstream stylesheet
 */
const source = () => "a[href^='foo\r\nbar'] {}";

module.exports = { source };
