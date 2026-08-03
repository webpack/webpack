"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	// only reachable on the main thread: a worker rejects emitFile
	this.emitFile("from-main-thread.txt", "ok");

	return source.replace("MAIN_VALUE", JSON.stringify("m"));
};
