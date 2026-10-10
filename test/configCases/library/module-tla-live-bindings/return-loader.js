"use strict";

/**
 * @param {string} source source
 * @returns {string} source with a top-level return
 */
module.exports = (source) => `${source}\nreturn;`;
