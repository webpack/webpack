"use strict";

const { stripVTControlCharacters } = require("util");

const regex =
	// eslint-disable-next-line no-control-regex
	/(?:\u001B\\][\s\S]*?(?:\u0007|\u001B\u005C|\u009C))|[\u001B\u009B][[\]()#;?]*(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]/g;

/**
 * @param {string} str raw string
 * @returns {string} string without VT control characters
 */
module.exports = (str) => {
	// Fast path
	if (!str.includes("\u001B") && !str.includes("\u009B")) {
		return str;
	}

	if (typeof stripVTControlCharacters === "function") {
		return stripVTControlCharacters(str);
	}

	// TODO remove me after update Node.js
	return str.replace(regex, "");
};
