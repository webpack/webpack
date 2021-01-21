/* global __resourceQuery */

"use strict";

if (!module.hot) {
	throw new Error(
		"Environment doesn't support lazy compilation (requires Hot Module Replacement enabled)"
	);
}

var urlBase = decodeURIComponent(__resourceQuery.slice(1));
exports.keepAlive = function (options) {
	var data = options.data;
	var onError = options.onError;
	var response;
	var request = require("http").request(
		urlBase + data,
		{
			agent: false,
			headers: { accept: "text/event-stream" }
		},
		function (res) {
			response = res;
			response.on("error", errorHandler);
		}
	);
	function errorHandler(err) {
		err.message =
			"Problem communicating active modules to the server: " + err.message;
		onError(err);
	}
	request.on("error", errorHandler);
	request.end();
	return function () {
		response.destroy();
	};
};
