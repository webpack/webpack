"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	this.addDependency(require("path").join(__dirname, "failed-dependency.txt"));
	throw new Error("loader failed after adding a dependency");
};
