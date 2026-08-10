"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		noParse: [path.resolve(__dirname, "not-parsed-a"), /not-parsed-b/]
	}
};
