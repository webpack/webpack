"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	// enable debug logging to see network requests!
	// stats: {
	// 	loggingDebug: /HttpUriPlugin/
	// },
	experiments: {
		buildHttp: [
			"https://cdn.esm.sh/",
			"https://cdn.skypack.dev/",
			"https://jspm.dev/",
			/^https:\/\/unpkg\.com\/.+\?module$/
		]
	}
};

module.exports = config;
