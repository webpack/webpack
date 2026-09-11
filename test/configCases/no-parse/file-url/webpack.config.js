"use strict";

const path = require("path");
const { pathToFileURL } = require("url");

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		noParse: [
			pathToFileURL(path.resolve(__dirname, "not-parsed-a")).href,
			pathToFileURL(path.resolve(__dirname, "not-parsed-b")).href
		]
	}
};
