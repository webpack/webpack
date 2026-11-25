"use strict";

/**
 * @returns {string} the upstream selector in a stylesheet
 */
const source = () => ".a( )".repeat(4000) + "{color:red}";

module.exports = { source };
