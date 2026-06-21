"use strict";

/* global __resourceQuery */

// Test-only lazy-compilation client: like hot/lazy-compilation-node.js but passes
// `rejectUnauthorized: false` so the self-signed HTTPS backend is accepted per
// request. Bun ignores a runtime `NODE_TLS_REJECT_UNAUTHORIZED`, so scoping the
// TLS bypass to this request (instead of the whole process) lets the case run
// under Bun too.
var urlBase = decodeURIComponent(__resourceQuery.slice(1));

exports.keepAlive = function (options) {
	var data = options.data;
	var response;
	var request = require(urlBase.startsWith("https") ? "https" : "http").request(
		urlBase + data,
		{
			agent: false,
			rejectUnauthorized: false,
			headers: { accept: "text/event-stream" }
		},
		function (res) {
			response = res;
			response.on("error", errorHandler);
			if (!options.active && !options.module.hot) {
				console.log(
					"Hot Module Replacement is not enabled. Waiting for process restart..."
				);
			}
		}
	);

	/**
	 * @param {Error} err error
	 */
	function errorHandler(err) {
		err.message =
			"Problem communicating active modules to the server: " + err.message;
		options.onError(err);
	}

	request.on("error", errorHandler);
	request.end();

	return function () {
		if (response) response.destroy();
	};
};

/**
 * @param {string} value new url value
 */
exports.setUrl = function (value) {
	urlBase = value;
};
