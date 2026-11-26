"use strict";

/**
 * @returns {string} the upstream stylesheet
 */
const source = () => "a::before { content: 'foo\r\nbar'; }";

module.exports = { source };
