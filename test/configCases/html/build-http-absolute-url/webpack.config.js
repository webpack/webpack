"use strict";

const path = require("node:path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	experiments: {
		html: true,
		buildHttp: {
			allowedUris: [() => true],
			lockfileLocation: path.resolve(__dirname, "./lock-files/lock.json"),
			cacheLocation: path.resolve(__dirname, "./lock-files/test")
		}
	}
};
