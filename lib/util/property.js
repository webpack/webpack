/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SAFE_IDENTIFIER = /^[_a-z$][_a-z$0-9]*$/i;
// An ECMAScript IdentifierName, which an import or export may name bare.
const IDENTIFIER_NAME = /^[\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*$/u;
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
	// module code
	"await",
	// skip future reserved keywords defined under ES1 till ES3
	// additional
	"null",
	"true",
	"false"
]);

/**
 * Returns a quoted object literal key for the given property name.
 * A `__proto__` key, quoted or not, sets the prototype, so it is returned as a computed key.
 * @param {string} prop property name
 * @returns {string} object literal key that defines an own property
 */
const quotedPropertyName = (prop) =>
	prop === "__proto__" ? '["__proto__"]' : JSON.stringify(prop);

/**
 * @summary Returns a valid JS property name for the given property.
 * Certain strings like "default", "null", and names with whitespace are not
 * valid JS property names, so they are returned as strings.
 * @param {string} prop property name to analyze
 * @returns {string} valid JS property name
 */
const propertyName = (prop) => {
	if (
		SAFE_IDENTIFIER.test(prop) &&
		!RESERVED_IDENTIFIER.has(prop) &&
		prop !== "__proto__"
	) {
		return prop;
	}
	return quotedPropertyName(prop);
};

/**
 * Returns code that defines an own enumerable `__proto__` property on an object.
 * Used where computed keys are not available, as a literal `__proto__` key sets the prototype.
 * @param {string} objectCode code of the object expression
 * @param {string} valueCode code of the property value
 * @returns {string} expression evaluating to the object
 */
const defineOwnProtoProperty = (objectCode, valueCode) =>
	`Object.defineProperty(${objectCode}, "__proto__", { enumerable: true, configurable: true, writable: true, value: ${valueCode} })`;

/**
 * Renders an object literal of entries, keeping entries named `__proto__` own properties.
 * Without computed keys those entries are left out of the literal and defined on it in order.
 * @template {{ name: string, value: string }} T
 * @param {T[]} entries entries with property name and value code
 * @param {(entries: T[]) => string} render renders an object literal of the given entries
 * @param {boolean | undefined} computedKeys true, when computed property keys are supported
 * @returns {string} object expression
 */
const renderObjectWithOwnProto = (entries, render, computedKeys) => {
	if (computedKeys) return render(entries);
	const protoEntries = entries.filter((entry) => entry.name === "__proto__");
	if (protoEntries.length === 0) return render(entries);
	return protoEntries.reduce(
		(object, entry) => defineOwnProtoProperty(object, entry.value),
		render(entries.filter((entry) => entry.name !== "__proto__"))
	);
};

/**
 * Returns chain of property accesses.
 * @param {readonly string[]} properties properties
 * @param {number} start start index
 * @returns {string} chain of property accesses
 */
const propertyAccess = (properties, start = 0) => {
	let str = "";
	for (let i = start; i < properties.length; i++) {
		const p = properties[i];
		// Only first chars 0-9, "-", "N", "I" can begin a canonical numeric form
		// (number, NaN, Infinity); skip the Number() round-trip otherwise.
		const c = p.charCodeAt(0);
		if (
			((c >= 48 && c <= 57) || c === 45 || c === 78 || c === 73) &&
			`${Number(p)}` === p
		) {
			str += `[${p}]`;
		} else if (SAFE_IDENTIFIER.test(p) && !RESERVED_IDENTIFIER.has(p)) {
			str += `.${p}`;
		} else {
			str += `[${JSON.stringify(p)}]`;
		}
	}
	return str;
};

module.exports = {
	IDENTIFIER_NAME,
	RESERVED_IDENTIFIER,
	SAFE_IDENTIFIER,
	defineOwnProtoProperty,
	propertyAccess,
	propertyName,
	quotedPropertyName,
	renderObjectWithOwnProto
};
