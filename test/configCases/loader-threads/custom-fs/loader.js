"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	// The worker context carries a compiler snapshot; the main thread has the full one.
	const ranInWorker = !this._compiler || this._compiler.hooks === undefined;

	if (ranInWorker) {
		throw new Error("a custom inputFileSystem must run loaders on the main thread");
	}

	return source;
};
