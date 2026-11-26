"use strict";

/**
 * @returns {string} the upstream stylesheet
 */
const source = () => "@keyframes foo {}\r\n/* comment */\r\n\r\n@media {}";

module.exports = { source };
