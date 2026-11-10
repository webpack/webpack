"use strict";

const path = require("path");

/** @type {import("../../../../").LoaderDefinitionFunction} */
module.exports = function (source) {
	this.addDependency(path.resolve(__dirname, "dependency.txt"));
	this.callback(null, source, { version: 3, sources: [this.resourcePath], names: [], mappings: "" }, { marker: "preserved" });
};
