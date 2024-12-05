/* global __resourceQuery */

"use strict";

// Decode and extract base URL from __resourceQuery
var urlBase = decodeURIComponent(__resourceQuery.slice(1));

/**
 * Manage the server connection to handle lazy compilation.
 * @param {{ data: string, onError: (err: Error) => void, active: boolean, module: NodeModule }} options Options for the connection
 * @returns {() => void} Function to destroy the response connection
 */
exports.keepAlive = function (options) {
	var data = options.data;
	var onError = options.onError;
	var active = options.active;
	var module = options.module;

	/** @type {import("http").IncomingMessage} */
	var response;

	// Determine the protocol and create the request
	var request = (
		urlBase.indexOf("https") === 0 ? require("https") : require("http")
	).request(
		urlBase + data,
		{
			agent: false,
			headers: { accept: "text/event-stream" }
		},
		function (res) {
			response = res;

			// Handle incoming data
			response.on("data", handleChunkUpdate);

			// Handle response errors
			response.on("error", errorHandler);

			// Log if HMR is not active
			if (!active && !module.hot) {
				console.log(
					"Hot Module Replacement is not enabled. Waiting for process restart..."
				);
			}
		}
	);

	/**
	 * Handle incoming chunk updates from the server.
	 * @param {Buffer} chunk Data chunk from the server
	 */
	function handleChunkUpdate(chunk) {
		try {
			var update = JSON.parse(chunk.toString());

			if (update.error) {
				console.error("Server error: " + update.error);
				onError(new Error(update.error));
			} else if (update.type === "reload") {
				console.warn("Critical chunk mismatch detected. Reloading...");
				throw new Error("Critical chunk mismatch detected."); // Throw an error to trigger an application restart
			} else {
				console.log("Received update: " + JSON.stringify(update));
			}
		} catch (_err) {
			console.warn("Non-JSON response received:", chunk.toString());
		}
	}

	/**
	 * Handle connection errors.
	 * @param {Error} err Error object
	 */
	function errorHandler(err) {
		err.message =
			"Problem communicating active modules to the server: " + err.message;
		console.error(err.message);
		onError(err);
	}

	// Handle request errors
	request.on("error", errorHandler);
	request.end();

	/**
	 * Cleanup function to destroy the response.
	 * @returns {void}
	 */
	return function () {
		if (response) response.destroy();
	};
};
