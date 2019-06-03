/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const SAFE_IDENTIFIER = /^[_a-zA-Z$][_a-zA-z$0-9]*$/;

const propertyAccess = (properties, start = 0) => {
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
