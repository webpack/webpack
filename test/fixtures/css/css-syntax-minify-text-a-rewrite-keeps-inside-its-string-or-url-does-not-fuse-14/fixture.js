"use strict";

const after = '.w{content:"*/}.x{color:red}.z{"}';

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `*{/&{color:red}}${after}`;

module.exports = { source };
