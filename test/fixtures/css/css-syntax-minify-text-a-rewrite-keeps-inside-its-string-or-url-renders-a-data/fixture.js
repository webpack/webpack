"use strict";

const payload = "data:text/css,/* %%32%41/ .x{color:red} /* */";

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `@import url("${payload}");`;

module.exports = { source };
