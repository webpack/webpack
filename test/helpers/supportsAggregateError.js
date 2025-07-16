"use strict";

module.exports = function supportsAggregateError() {
	return typeof AggregateError !== "undefined";
};
