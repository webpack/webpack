"use strict";

/**
 * @returns {string} the upstream stylesheet
 */
const source = () => "a{\r\n @extends .class;\r\n --custom-prop: value;\r\n}";

module.exports = { source };
