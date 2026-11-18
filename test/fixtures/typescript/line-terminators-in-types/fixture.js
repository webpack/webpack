"use strict";

/**
 * @returns {string} types spanning CRLF line breaks, which a file in the repository cannot keep
 */
const source = () =>
	[
		"let a: {",
		"\tb: number;",
		"} = { b: 1 };",
		"type C =",
		"\t| 1",
		"\t| 2;",
		"let d = 1;",
		""
	].join("\r\n");

module.exports = { source };
