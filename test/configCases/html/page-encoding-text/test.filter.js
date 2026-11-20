"use strict";

// a global only from Node.js 11
// eslint-disable-next-line n/prefer-global/text-decoder
const { TextDecoder } = require("util");

// needs full ICU, and a windows-1252 decoder that maps 0x80 to "€"
// (Node.js 20 decodes it as latin1)
module.exports = () => {
	try {
		return (
			new TextDecoder("shift_jis").encoding === "shift_jis" &&
			new TextDecoder("windows-1252").decode(new Uint8Array([0x80])) === "€"
		);
	} catch (_err) {
		return false;
	}
};
