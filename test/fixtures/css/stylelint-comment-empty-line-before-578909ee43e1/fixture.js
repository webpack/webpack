"use strict";

/**
 * @returns {string} the upstream stylesheet
 */
const source = () => "a { color: pink;\r\n/** comment */\r\ntop: 0; }";

module.exports = { source };
