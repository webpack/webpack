"use strict";

/**
 * @returns {string} a lone high surrogate inside a token
 */
const source = () => `a${  String.fromCharCode(0xd800)  }b`;

module.exports = { source };
