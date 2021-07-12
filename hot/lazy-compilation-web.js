/* global __resourceQuery */

"use strict";

var urlBase = decodeURIComponent(__resourceQuery.slice(1));
var activePing;
var activeKeys = new Map();
var errorHandlers = new Set();

var updatePing = function updatePing() {
	if (activeKeys.size) {
		activePing = fetch(urlBase + Array.from(activeKeys.keys()).join("@"), {
			mode: "no-cors"
		}).then(function (response) {
			if (response.status >= 400 && response.status < 600) {
				throw new Error("Bad response from server: " + response.status);
			}
			return response;
		});
		activePing.catch(function (err) {
			console.error("Problem in lazy compilation:");
			errorHandlers.forEach(function (onError) {
				onError(new Error(err));
			});
		});
	} else {
		activePing = undefined;
	}
};

exports.keepAlive = function (options) {
	var data = options.data;
	var onError = options.onError;
	var active = options.active;
	var module = options.module;
	errorHandlers.add(onError);
	var value = activeKeys.get(data) || 0;
	activeKeys.set(data, value + 1);
	if (value === 0) {
		updatePing();
	}
	if (!active && !module.hot) {
		console.log(
			"Hot Module Replacement is not enabled. Waiting for process restart..."
		);
	}

	return function () {
		errorHandlers.delete(onError);
		setTimeout(function () {
			var value = activeKeys.get(data);
			if (value === 1) {
				activeKeys.delete(data);
				updatePing();
			} else {
				activeKeys.set(data, value - 1);
			}
		}, 1000);
	};
};
