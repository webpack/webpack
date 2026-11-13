"use strict";

/** @type {(i: number) => string} */
const rule = (i) => `.c${i}>d${i}:hover{color:#ff0000;margin:${i + 1}px}`;
const big = Array.from({ length: 4000 }, (_, i) => rule(i)).join("");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `@media print{${big}/*x*/}`;

module.exports = { source };
