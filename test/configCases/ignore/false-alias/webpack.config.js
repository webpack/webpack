"use strict";

module.exports = {
	entry: "./test.js",
	resolve: {
		alias: {
			"ignored-module": false,
			"./ignored-module": false
		}
	}
};
