"use strict";

/* global __resourceQuery */

var urlBase = decodeURIComponent(__resourceQuery.slice(1));

/**
 * @param {{ data: string, onError: (err: Error) => void, active: boolean, module: module }} options options
 * @returns {() => void} function to destroy response
 */
exports.keepAlive = function (options) {
	var data = options.data;

	/**
	 * @param {Error} err error
	 */
	function errorHandler(err) {
		err.message =
			"Problem communicating active modules to the server: " + err.message;
		options.onError(err);
	}

	/** @type {import("http").IncomingMessage} */
	var mod = urlBase.startsWith("https") ? import("https") : import("http");

	var request;
	var response;

	mod.then((client) => {
		request = client.request(
			urlBase + data,
			{
				agent: false,
				headers: { accept: "text/event-stream" }
			},
			function (res) {
				response = res;
				response.on("error", errorHandler);

				if (!options.activ && !options.module.hot) {
					console.log(
						"Hot Module Replacement is not enabled. Waiting for process restart..."
					);
				}
			}
		);

		request.on("error", errorHandler);
		request.end();
	});

	return function () {
		if (response) {
			response.destroy();
		}
	};
};

exports.setUrl = function (value) {
	urlBase = value;
};
