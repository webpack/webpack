"use strict";

const path = require("path");

/** @type {import("../../../../").LoaderDefinitionFunction} */
module.exports = function (source, sourceMap, additionalData) {
	if (!this.loaders[this.loaderIndex + 1].data.pitched) throw new Error("Pitch did not run");
	if (!sourceMap || typeof sourceMap === "string" || sourceMap.version !== 3 || !additionalData || additionalData.marker !== "preserved") {
		throw new Error("The source test changed loader metadata");
	}
	if (!this.getDependencies().includes(path.resolve(__dirname, "dependency.txt"))) {
		throw new Error("The source test changed loader dependencies");
	}
	this.callback(null, source, sourceMap, additionalData);
};
