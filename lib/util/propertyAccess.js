/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SAFE_IDENTIFIER = /^[_a-zA-Z$][_a-zA-z$0-9]*$/;

/**
 * @param {string[] | string}  properties  a list of properties ["alpha","beta"]
 * or a string path representation "alpha/beta"
 * @param {number} start index of property which should begin the chain
 *
 * @returns {string} - escaped property chain as string e.g.
 * ["0alpha"]
 * ["be\"ta"]
 * .gamma - regular dot accessor if no escaped characters
 */
const propertyAccess = (properties, start = 0) => {
	if (typeof properties === "string") properties = properties.split("/");
	return propListToString(properties, start);
};

/**
 * @param {string[]} properties a list of properties ["alpha","beta"]
 * @param {number} start index of property which should begin the chain
 *
 * @returns {string} - escaped property chain as string e.g.
 * ["0alpha"]
 * ["be\"ta"]
 * .gamma - regular if no escape
 */
const propListToString = (properties, start = 0) => {
	let str = "";
	for (let i = start; i < properties.length; i++) {
		const p = properties[i];
		if (`${+p}` === p) {
			str += `[${p}]`;
		} else if (SAFE_IDENTIFIER.test(p)) {
			str += `.${p}`;
		} else {
			str += `[${JSON.stringify(p)}]`;
		}
	}
	return str;
};

module.exports = propertyAccess;
