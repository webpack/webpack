"use strict";

/** @type {import("../../../../").LoaderDefinitionFunction} */
module.exports = function (source) {
	return source.replace('"__VALUE__"', '"transformed"');
};
