"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	output: {
		uniqueName: "app"
	},
	experiments: {
		css: true
	}
};

module.exports = config;
