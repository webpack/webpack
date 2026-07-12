"use strict";

const path = require("node:path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	resolve: {
		alias: {
			_: [path.resolve(__dirname, "a"), path.resolve(__dirname, "b")]
		}
	}
};
