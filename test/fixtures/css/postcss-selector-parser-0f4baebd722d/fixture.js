"use strict";

/**
 * @returns {string} the upstream selector in a stylesheet
 */
const source = () => "/**/ ".repeat(20000) + "{color:red}";

module.exports = { source };
