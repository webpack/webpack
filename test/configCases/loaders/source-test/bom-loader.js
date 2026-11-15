"use strict";

/** @type {import("../../../../").LoaderDefinitionFunction} */
module.exports = function (source) {
	return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(source)]);
};
