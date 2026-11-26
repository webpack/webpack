"use strict";

/**
 * @returns {string} the upstream stylesheet
 */
const source = () => "a[href^='one\\\r\ntwo'] { display: block; }";

module.exports = { source };
