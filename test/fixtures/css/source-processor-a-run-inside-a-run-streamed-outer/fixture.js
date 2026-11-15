"use strict";

/**
 * @returns {string} a block past the streamed block's 16,384 nodes
 */
const source = () => `a { ${"color : red ; ".repeat(12000)}} b { top : 0px }`;

module.exports = { source };
