"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		noParse(content) {
			return /not-parsed/.test(content);
		}
	}
};
