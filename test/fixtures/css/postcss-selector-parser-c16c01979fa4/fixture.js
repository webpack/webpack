"use strict";

/**
 * @returns {string} the upstream selector in a stylesheet
 */
const source = () => ":not(".repeat(1000) + "a" + ")".repeat(1000) + "{color:red}";

module.exports = { source };
