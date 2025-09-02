"use strict";

module.exports = function filter() {
	return process.platform !== "win32";
};
