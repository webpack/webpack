/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SAFE_IDENTIFIER = /^[_a-zA-Z$][_a-zA-Z$0-9]*$/;
const RESERVED_IDENTIFIER = new Set([
	"break",
	"case",
	"catch",
	"class",
	"const",
	"continue",
	"debugger",
	"default",
	"delete",
	"do",
	"else",
	"export",
	"extends",
	"finally",
	"for",
	"function",
	"if",
	"import",
	"in",
	"instanceof",
	"new",
	"return",
	"super",
	"switch",
	"this",
	"throw",
	"try",
	"typeof",
	"var",
	"void",
	"while",
	"with",
	"enum",
	// strict mode
	"implements",
	"interface",
	"let",
	"package",
	"private",
	"protected",
	"public",
	"static",
	"yield",
	"yield",
	// module code
	"await",
	// skip future reserved keywords defined under ES1 till ES3
	// additional
	"null",
	"true",
	"false"
]);

const propertyAccess = (properties, start = 0) => {
	let str = "";
	for (let i = start; i < properties.length; i++) {
		const p = properties[i];
		if (`${+p}` === p) {
			str += `[${p}]`;
		} else if (SAFE_IDENTIFIER.test(p) && !RESERVED_IDENTIFIER.has(p)) {
			str += `.${p}`;
		} else {
			str += `[${JSON.stringify(p)}]`;
		}
	}
	return str;
};

module.exports = propertyAccess;
