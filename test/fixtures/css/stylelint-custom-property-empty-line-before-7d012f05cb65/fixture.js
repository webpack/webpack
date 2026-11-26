"use strict";

/**
 * @returns {string} the upstream stylesheet
 */
const source = () => "a {\n --custom-prop:value; \r\n\r\n --custom-prop2: value;}";

module.exports = { source };
