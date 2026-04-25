"use strict";

module.exports = function filter() {
	return /^v(20|22|24)/.test(process.version);
};
