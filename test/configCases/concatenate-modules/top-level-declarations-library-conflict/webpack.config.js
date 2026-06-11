"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	output: {
		library: { name: "MyLib", type: "var" }
	},
	optimization: {
		concatenateModules: true,
		minimize: false
	}
};
