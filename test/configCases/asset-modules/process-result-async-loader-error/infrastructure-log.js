"use strict";

// A module carrying a build error is rebuilt on every run by design.
module.exports = (options) =>
	options.cache && options.cache.type === "filesystem"
		? [/Pack got invalid because of write to/]
		: [];
