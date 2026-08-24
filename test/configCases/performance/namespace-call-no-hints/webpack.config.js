"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false
	},
	performance: {
		hints: false,
		namespaceCall: true
	}
};
