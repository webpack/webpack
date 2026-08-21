"use strict";

/**
 * @param {string} source source
 * @returns {string} generated module
 */
module.exports = (source) => `module.exports = ${JSON.stringify(source.trim())};`;
