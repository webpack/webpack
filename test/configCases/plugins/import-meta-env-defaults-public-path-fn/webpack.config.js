"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	output: {
		// a function publicPath has no static value, so BASE_URL falls back to "/"
		publicPath: () => "/from-fn/"
	}
};
