"use strict";

/**
 * @returns {string} an `@media` block of 1800 rules, then a rule after it
 */
const source = () =>
	`@media screen{${Array.from({ length: 1800 }, (_, i) => `.c${i}>d${i}:hover{color:red;margin:${i + 1}px}`).join("")}}x{y:0px}`;

module.exports = { source };
