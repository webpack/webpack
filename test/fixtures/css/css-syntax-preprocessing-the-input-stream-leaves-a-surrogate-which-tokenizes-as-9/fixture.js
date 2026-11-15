"use strict";

/**
 * @returns {string} a lone high surrogate inside a token
 */
const source = () => `url(a${  String.fromCharCode(0xd800)  }b)`;

module.exports = { source };
