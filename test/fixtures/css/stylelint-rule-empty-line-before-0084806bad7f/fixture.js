"use strict";

/**
 * @returns {string} the upstream stylesheet
 */
const source = () => "@media {\r\na {}\r\n/* comment */\r\n\r\nb {}}";

module.exports = { source };
