"use strict";

/**
 * @returns {string} the upstream selector in a stylesheet
 */
const source = () => "[x=\"\\" + "0".repeat(4) + "61\u000bb\"]{color:red}";

module.exports = { source };
