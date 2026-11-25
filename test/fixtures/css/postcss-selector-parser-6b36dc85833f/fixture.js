"use strict";

/**
 * @returns {string} the upstream selector in a stylesheet
 */
const source = () => "a" + " /**/".repeat(19999) + " {color:red}";

module.exports = { source };
