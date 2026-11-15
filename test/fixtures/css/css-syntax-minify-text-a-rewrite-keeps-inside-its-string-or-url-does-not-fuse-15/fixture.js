"use strict";

const after = '.w{content:"*/}.x{color:red}.z{"}';

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `.a{&url(/*){color:red}}${after}`;

module.exports = { source };
