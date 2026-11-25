"use strict";

/**
 * @returns {string} the upstream selector in a stylesheet
 */
const source = () => "[x=\"\\" + "0".repeat(4) + "61\fb\"]{color:red}";

module.exports = { source };
