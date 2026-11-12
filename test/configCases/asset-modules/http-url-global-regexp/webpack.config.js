"use strict";

const {
	experiments: {
		schemes: { HttpUriPlugin }
	}
} = require("../../../../");
const ServerPlugin = require("../http-url/server");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		new ServerPlugin(9991),
		new HttpUriPlugin({
			allowedUris: [/^http:\/\/localhost:9991\//g],
			upgrade: false,
			frozen: false,
			cacheLocation: false
		})
	]
};
