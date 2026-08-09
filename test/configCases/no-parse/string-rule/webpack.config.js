"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		// a string rule is a prefix of the module request
		noParse: path.resolve(__dirname, "not-parsed-")
	}
};
