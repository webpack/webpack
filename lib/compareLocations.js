/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */

/**
 * Compare two locations
 * @param {DependencyLocation} a A location node
 * @param {DependencyLocation} b A location node
 * @returns {-1|0|1} sorting comparator value
 */
module.exports = (a, b) => {
	let isObjectA = typeof a === "object" && a !== null;
	let isObjectB = typeof b === "object" && b !== null;
	if (!isObjectA || !isObjectB) {
		if (isObjectA) return 1;
		if (isObjectB) return -1;
		return 0;
	}
	if ("start" in a && "start" in b) {
		const ap = a.start;
		const bp = b.start;
		if (ap.line < bp.line) return -1;
		if (ap.line > bp.line) return 1;
		if (ap.column < bp.column) return -1;
		if (ap.column > bp.column) return 1;
	}
	if ("name" in a && "name" in b) {
		if (a.name < b.name) return -1;
		if (a.name > b.name) return 1;
	}
	if ("index" in a && "index" in b) {
		if (a.index < b.index) return -1;
		if (a.index > b.index) return 1;
	}
	return 0;
};
