/* global __resourceQuery */

"use strict";

if (typeof EventSource !== "function" || !module.hot) {
	throw new Error(
		"Environment doesn't support lazy compilation (requires EventSource and Hot Module Replacement enabled)"
	);
}

var urlBase = decodeURIComponent(__resourceQuery.slice(1));
var activeEventSource;
var activeKeys = new Map();

var updateEventSource = function updateEventSource() {
	if (activeEventSource) activeEventSource.close();
	activeEventSource = new EventSource(
		urlBase + Array.from(activeKeys.keys()).join("@")
	);
};

exports.keepAlive = function (key) {
	var value = activeKeys.get(key) || 0;
	activeKeys.set(key, value + 1);
	if (value === 0) {
		updateEventSource();
	}

	return function () {
		setTimeout(function () {
			var value = activeKeys.get(key);
			if (value === 1) {
				activeKeys.delete(key);
				updateEventSource();
			} else {
				activeKeys.set(key, value - 1);
			}
		}, 1000);
	};
};
