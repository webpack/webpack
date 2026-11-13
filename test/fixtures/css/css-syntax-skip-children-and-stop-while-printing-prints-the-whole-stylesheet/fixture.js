"use strict";

/** @type {(i: number) => string} */
const rule = (i) => `.c${i}>d${i}:hover{color:#ff0000;margin:${i + 1}px}`;
const BIG = Array.from({ length: 1800 }, (_, i) => rule(i)).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `a{b:1}${BIG}c{d:2}`;

module.exports = { source };
