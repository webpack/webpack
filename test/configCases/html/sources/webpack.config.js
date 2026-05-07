"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	optimization: {
		concatenateModules: true
	},
	experiments: {
		html: true
	}
};
