"use strict";

const after = ".e{color:blue}";

/**
 * @returns {string} the stylesheet the test reads
 */
const source = () =>
	`.b{background:linear-gradient(red,"x,"red 10% 20%)}${after}`;

module.exports = { source };
