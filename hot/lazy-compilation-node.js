"use strict";

/** @import http, { ClientRequest, IncomingMessage } from "http" */
/** @import https from "https" */

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

	/** @type {Promise<http | https>} */
	var mod = require("./load-http")(urlBase.startsWith("https"));

	/** @type {ClientRequest} */
	var request;
	/** @type {IncomingMessage} */
	var response;

	mod.then(function (client) {
		request = client.request(
			urlBase + data,
			{
				agent: false,
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

		request.on("error", errorHandler);
		request.end();
	});

	return function () {
		if (response) {
			response.destroy();
		}
	};
};

/**
 * @param {string} value new url value
 */
exports.setUrl = function (value) {
	urlBase = value;
};
