"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	let threw = false;
	try {
		// eslint-disable-next-line no-unused-expressions
		this._compilation;
	} catch (_err) {
		threw = true;
	}
	if (!threw) {
		throw new Error("_compilation should throw when read in a worker");
	}

	return source.replace("WORKER_VALUE", JSON.stringify("w"));
};
