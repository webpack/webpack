"use strict";

/** @type {import("../../../../").LoaderDefinitionFunction} */
module.exports = function (source) {
	return `${source}\n/* generated:marker */`;
};
