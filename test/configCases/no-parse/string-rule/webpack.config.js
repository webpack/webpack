"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		// a string rule is a prefix of the module request
		noParse: path.resolve(__dirname, "not-parsed-")
	}
};
