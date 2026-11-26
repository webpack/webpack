"use strict";

/**
 * @returns {string} the upstream stylesheet
 */
const source = () => "a{\n @extends .class;\n\r\n --custom-prop: value;}";

module.exports = { source };
