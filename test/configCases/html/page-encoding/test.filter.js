"use strict";

// a global only from Node.js 11
// eslint-disable-next-line n/prefer-global/text-decoder
const { TextDecoder } = require("util");

// a legacy encoding is kept only where the runtime decodes it (full ICU)
module.exports = () => {
	try {
		return new TextDecoder("shift_jis").encoding === "shift_jis";
	} catch (_err) {
		return false;
	}
};
