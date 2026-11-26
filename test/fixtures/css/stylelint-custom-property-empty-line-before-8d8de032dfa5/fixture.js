"use strict";

/**
 * @returns {string} the upstream stylesheet
 */
const source = () => "a {\r\n/* comment */\r\nn--custom-prop: value;\r\n}";

module.exports = { source };
