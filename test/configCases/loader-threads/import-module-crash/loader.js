"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	this.async();
	this.importModule("./nested", {}, () => {});
	setTimeout(() => process.exit(1), 10);
};
