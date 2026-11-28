"use strict";

// A string holding an escaped CRLF and the commas of a selector list after it,
// written in a file this way the line endings a checkout picks leave alone.
/**
 * @returns {string} the stylesheet the test reads
 */
const source = () => '[b="x\\\r\n],.z,["],.b{top:0}';

module.exports = { source };
