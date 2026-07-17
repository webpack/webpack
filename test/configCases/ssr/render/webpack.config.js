"use strict";

const { SSRManifestPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	// universal target: the same bundle renders on the server and hydrates on the client
	target: ["web", "node"],
	mode: "development",
	devtool: false,
	experiments: {
		css: true,
		outputModule: true
	},
	plugins: [new SSRManifestPlugin()]
};
