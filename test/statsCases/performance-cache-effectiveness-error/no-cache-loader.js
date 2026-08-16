"use strict";

/** @type {import("../../../").LoaderDefinition} */
module.exports = function (source) {
	this.cacheable(false);
	return source;
};
