"use strict";

const prelude = Array.from({ length: 9000 }, (_, i) => `x${i}`).join(" ");

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => `.p{.a{x:1}@st ${prelude};.b{y:1}}`;

module.exports = { source };
