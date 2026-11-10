"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	resolve: {
		alias: {
			"remote-cache": path.resolve(__dirname, "./lock-files/test")
		}
	},
	experiments: {
		buildHttp: {
			allowedUris: ["http://localhost:9990/"],
			frozen: true,
			lockfileLocation: path.resolve(__dirname, "./lock-files/lock.json"),
			cacheLocation: path.resolve(__dirname, "./lock-files/test")
		}
	}
};
