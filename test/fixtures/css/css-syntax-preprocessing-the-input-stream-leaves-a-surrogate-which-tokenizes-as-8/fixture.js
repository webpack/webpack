"use strict";

/**
 * @returns {string} a lone high surrogate inside a token
 */
const source = () => `12${  String.fromCharCode(0xd800)  }red`;

module.exports = { source };
