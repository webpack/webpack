"use strict";

/**
 * @returns {string} the upstream selector in a stylesheet
 */
const source = () => "a".repeat(8000) + "|a{color:red}";

module.exports = { source };
