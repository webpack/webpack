/* global __resourceQuery */

"use strict";

if (!module.hot) {
	throw new Error(
		"Environment doesn't support lazy compilation (requires Hot Module Replacement enabled)"
	);
}

var urlBase = decodeURIComponent(__resourceQuery.slice(1));
exports.keepAlive = function (key) {
	var response;
	require("http")
		.request(
			urlBase + key,
			{
				agent: false,
				headers: { accept: "text/event-stream" }
			},
			function (res) {
				response = res;
			}
		)
		.end();
	return function () {
		response.destroy();
	};
};
