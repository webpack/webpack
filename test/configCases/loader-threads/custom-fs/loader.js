"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	const { isMainThread } = require("worker_threads");

	if (!isMainThread) {
		throw new Error("a custom inputFileSystem must run loaders on the main thread");
	}

	return source;
};
