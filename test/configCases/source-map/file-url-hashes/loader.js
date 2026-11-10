"use strict";

const { pathToFileURL } = require("url");

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	this.callback(null, source, {
		version: 3,
		file: "entry file.js",
		sources: [pathToFileURL(this.resourcePath).href],
		sourcesContent: [source],
		names: [],
		mappings: "AAAA"
	});
};
